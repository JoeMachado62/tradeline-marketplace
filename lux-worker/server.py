"""
Lux Automation Worker - Socket.IO Server for Browser Control

This service runs on the VPS and coordinates with browser clients to
automate form filling on supplier websites.

Architecture:
- Socket.IO server accepts connections from browser extensions
- Each automation session gets its own namespace: /session/{session_id}
- Lux AI analyzes screenshots and decides actions
- Actions are emitted to the browser client for execution
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import socketio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("lux_worker")

# Try importing OAGI components
try:
    from oagi import AsyncActor, PILImage, ImageConfig
    OAGI_AVAILABLE = True
    logger.info("OAGI SDK loaded successfully")
except ImportError as e:
    logger.warning(f"OAGI SDK not available: {e}")
    OAGI_AVAILABLE = False


class SessionStatus(str, Enum):
    WAITING = "waiting"           # Waiting for browser to connect
    CONNECTED = "connected"       # Browser connected, ready to start
    RUNNING = "running"           # Automation in progress
    PAUSED = "paused"             # Waiting for human intervention
    COMPLETED = "completed"       # Successfully finished
    FAILED = "failed"             # Error occurred
    CANCELLED = "cancelled"       # Manually stopped


@dataclass
class AutomationSession:
    """Represents a single automation session"""
    id: str
    order_id: str
    status: SessionStatus
    created_at: datetime
    instruction: str
    context: Dict[str, Any]
    current_step: int = 0
    total_steps: int = 0
    last_action: Optional[str] = None
    last_screenshot_url: Optional[str] = None
    error: Optional[str] = None
    completed_at: Optional[datetime] = None


class StartSessionRequest(BaseModel):
    session_id: str
    order_id: str
    instruction: str
    context: dict = {}


class SessionResponse(BaseModel):
    session_id: str
    status: str
    message: str


# Session storage (in-memory for Phase 1, can be Redis later)
sessions: Dict[str, AutomationSession] = {}

# Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

# FastAPI app
app = FastAPI(
    title="Lux Automation Worker",
    description="Socket.IO server for browser automation with OpenAGI Lux",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)


# ============ REST API Endpoints ============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "oagi_available": OAGI_AVAILABLE,
        "active_sessions": len([s for s in sessions.values() if s.status == SessionStatus.RUNNING]),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/sessions", response_model=SessionResponse)
async def create_session(request: StartSessionRequest):
    """Create a new automation session (called by Node.js)"""
    
    if request.session_id in sessions:
        raise HTTPException(status_code=409, detail="Session already exists")
    
    session = AutomationSession(
        id=request.session_id,
        order_id=request.order_id,
        status=SessionStatus.WAITING,
        created_at=datetime.utcnow(),
        instruction=request.instruction,
        context=request.context
    )
    
    sessions[request.session_id] = session
    
    logger.info(f"Created session {request.session_id} for order {request.order_id}")
    
    return SessionResponse(
        session_id=request.session_id,
        status=session.status.value,
        message=f"Session created. Waiting for browser to connect to /session/{request.session_id}"
    )


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session status"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return asdict(session)


@app.delete("/sessions/{session_id}")
async def cancel_session(session_id: str):
    """Cancel an active session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    session.status = SessionStatus.CANCELLED
    
    # Notify connected browser
    await sio.emit("session_cancelled", {"reason": "Cancelled by admin"}, namespace=f"/session/{session_id}")
    
    logger.info(f"Cancelled session {session_id}")
    
    return {"message": "Session cancelled"}


@app.get("/sessions")
async def list_sessions():
    """List all sessions"""
    return {
        "sessions": [asdict(s) for s in sessions.values()],
        "total": len(sessions)
    }


# ============ Socket.IO Event Handlers ============

@sio.on("connect")
async def on_connect(sid, environ):
    """Handle connection to default namespace"""
    logger.info(f"Client connected to default namespace: {sid}")


@sio.on("disconnect")
async def on_disconnect(sid):
    """Handle disconnection from default namespace"""
    logger.info(f"Client disconnected from default namespace: {sid}")


# Dynamic namespace handler for sessions
class SessionNamespace(socketio.AsyncNamespace):
    """Handler for session-specific namespaces: /session/{session_id}"""
    
    def __init__(self, namespace: str):
        super().__init__(namespace)
        self.session_id = namespace.split("/")[-1]
        self.actor = None
        self.current_sid = None
    
    async def on_connect(self, sid, environ):
        """Browser client connected to session"""
        logger.info(f"Browser connected to session {self.session_id}: {sid}")
        
        if self.session_id not in sessions:
            logger.error(f"Session {self.session_id} not found")
            await self.emit("error", {"message": "Session not found"}, to=sid)
            return False
        
        session = sessions[self.session_id]
        session.status = SessionStatus.CONNECTED
        self.current_sid = sid
        
        # Notify that we're ready
        await self.emit("session_ready", {
            "session_id": self.session_id,
            "instruction": session.instruction,
            "context": session.context
        }, to=sid)
        
        logger.info(f"Session {self.session_id} is ready")
    
    async def on_disconnect(self, sid):
        """Browser client disconnected"""
        logger.warning(f"Browser disconnected from session {self.session_id}: {sid}")
        
        if self.session_id in sessions:
            session = sessions[self.session_id]
            if session.status == SessionStatus.RUNNING:
                session.status = SessionStatus.PAUSED
                session.error = "Browser disconnected during automation"
    
    async def on_start_automation(self, sid, data):
        """Start the automation process"""
        logger.info(f"Starting automation for session {self.session_id}")
        
        if self.session_id not in sessions:
            await self.emit("error", {"message": "Session not found"}, to=sid)
            return
        
        session = sessions[self.session_id]
        session.status = SessionStatus.RUNNING
        
        # Request initial screenshot
        await self.emit("request_screenshot", {}, to=sid)
    
    async def on_screenshot(self, sid, data):
        """Receive screenshot from browser and process with Lux"""
        logger.info(f"Received screenshot for session {self.session_id}")
        
        if self.session_id not in sessions:
            return
        
        session = sessions[self.session_id]
        
        if not OAGI_AVAILABLE:
            await self.emit("error", {"message": "OAGI SDK not available"}, to=sid)
            session.status = SessionStatus.FAILED
            session.error = "OAGI SDK not available"
            return
        
        try:
            # Decode screenshot (base64 -> PIL Image)
            import base64
            from io import BytesIO
            from PIL import Image
            
            image_data = base64.b64decode(data.get("image", ""))
            image = Image.open(BytesIO(image_data))
            
            # Convert to OAGI image format
            pil_image = PILImage(image)
            
            # Initialize or continue with Actor
            if self.actor is None:
                self.actor = AsyncActor()
                await self.actor.__aenter__()
                await self.actor.init_task(session.instruction)
            
            # Get next step from Lux
            step = await self.actor.step(pil_image)
            session.current_step += 1
            
            if step.stop:
                # Automation complete
                session.status = SessionStatus.COMPLETED
                session.completed_at = datetime.utcnow()
                await self.emit("automation_complete", {
                    "success": True,
                    "steps": session.current_step
                }, to=sid)
                
                # Cleanup
                await self.actor.__aexit__(None, None, None)
                self.actor = None
                
                logger.info(f"Session {self.session_id} completed successfully")
            else:
                # Execute actions
                for action in step.actions:
                    action_data = self._convert_action(action)
                    session.last_action = action_data.get("type")
                    
                    await self.emit(action_data["type"], action_data, to=sid)
                    
                    # Wait for action acknowledgment (handled by ack callback)
                    await asyncio.sleep(0.5)
                
                # Request next screenshot
                await asyncio.sleep(0.3)  # Wait for page to update
                await self.emit("request_screenshot", {}, to=sid)
        
        except Exception as e:
            logger.error(f"Error processing screenshot: {e}")
            session.status = SessionStatus.FAILED
            session.error = str(e)
            await self.emit("error", {"message": str(e)}, to=sid)
    
    async def on_action_complete(self, sid, data):
        """Browser confirms action was executed"""
        logger.debug(f"Action complete: {data}")
    
    async def on_action_error(self, sid, data):
        """Browser reports action error"""
        logger.error(f"Action error in session {self.session_id}: {data}")
        
        if self.session_id in sessions:
            session = sessions[self.session_id]
            session.status = SessionStatus.FAILED
            session.error = data.get("message", "Unknown action error")
    
    def _convert_action(self, action) -> dict:
        """Convert OAGI action to Socket.IO event format"""
        action_type = action.__class__.__name__.lower()
        
        if hasattr(action, 'x') and hasattr(action, 'y'):
            return {"type": "click", "x": action.x, "y": action.y}
        elif hasattr(action, 'text'):
            return {"type": "type", "text": action.text}
        elif hasattr(action, 'direction'):
            return {"type": "scroll", "direction": action.direction, "amount": getattr(action, 'amount', 3)}
        elif hasattr(action, 'key'):
            return {"type": "keypress", "key": action.key}
        else:
            return {"type": "unknown", "data": str(action)}


# Register session namespaces dynamically
@app.on_event("startup")
async def startup():
    """Register dynamic namespace handler"""
    # This creates namespaces on-demand when sessions are created
    pass


@app.post("/sessions/{session_id}/register-namespace")
async def register_namespace(session_id: str):
    """Register a Socket.IO namespace for a session"""
    namespace = f"/session/{session_id}"
    
    if namespace not in sio.namespace_handlers:
        sio.register_namespace(SessionNamespace(namespace))
        logger.info(f"Registered namespace: {namespace}")
    
    return {"namespace": namespace}


# ============ Main Entry Point ============

def main():
    """Run the Lux worker server"""
    host = os.getenv("LUX_WORKER_HOST", "0.0.0.0")
    port = int(os.getenv("LUX_WORKER_PORT", "8765"))
    
    logger.info(f"Starting Lux Worker on {host}:{port}")
    logger.info(f"OAGI SDK available: {OAGI_AVAILABLE}")
    
    uvicorn.run(
        socket_app,
        host=host,
        port=port,
        log_level="info"
    )


if __name__ == "__main__":
    main()
