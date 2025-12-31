/**
 * Tradeline Automation Client - Background Service Worker
 * 
 * Manages Socket.IO connection to Lux Worker and coordinates
 * with content scripts to execute actions.
 */

// Socket.IO client (will be loaded from CDN in the extension)
let socket = null;
let currentSessionId = null;
let serverUrl = null;

// Message handling from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type);
  
  switch (message.type) {
    case 'CONNECT_SESSION':
      connectToSession(message.serverUrl, message.sessionId)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Async response
      
    case 'DISCONNECT_SESSION':
      disconnectSession();
      sendResponse({ success: true });
      break;
      
    case 'GET_STATUS':
      sendResponse({
        connected: socket && socket.connected,
        sessionId: currentSessionId,
        serverUrl: serverUrl
      });
      break;
      
    case 'START_AUTOMATION':
      if (socket && socket.connected) {
        socket.emit('start_automation', {});
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Not connected' });
      }
      break;
      
    case 'SCREENSHOT_CAPTURED':
      if (socket && socket.connected) {
        socket.emit('screenshot', { image: message.imageData });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Not connected' });
      }
      break;
      
    case 'ACTION_COMPLETE':
      if (socket && socket.connected) {
        socket.emit('action_complete', message.data);
        sendResponse({ success: true });
      }
      break;
      
    case 'ACTION_ERROR':
      if (socket && socket.connected) {
        socket.emit('action_error', message.data);
      }
      break;
  }
});

/**
 * Connect to a Lux session via Socket.IO
 */
async function connectToSession(url, sessionId) {
  // Dynamic import of Socket.IO client
  if (!window.io) {
    // Load Socket.IO client
    await loadSocketIO();
  }
  
  serverUrl = url;
  currentSessionId = sessionId;
  
  const namespace = `/session/${sessionId}`;
  
  return new Promise((resolve, reject) => {
    try {
      socket = io(serverUrl, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Connect to session namespace
      socket = io(`${serverUrl}${namespace}`, {
        path: '/socket.io/',
        transports: ['websocket', 'polling']
      });
      
      socket.on('connect', () => {
        console.log('[Background] Connected to Lux Worker');
        updateBadge('connected');
        resolve({ success: true, sessionId });
      });
      
      socket.on('connect_error', (error) => {
        console.error('[Background] Connection error:', error);
        updateBadge('error');
        reject(error);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('[Background] Disconnected:', reason);
        updateBadge('disconnected');
      });
      
      // Session events
      socket.on('session_ready', (data) => {
        console.log('[Background] Session ready:', data);
        notifyPopup('SESSION_READY', data);
      });
      
      socket.on('session_cancelled', (data) => {
        console.log('[Background] Session cancelled:', data);
        notifyPopup('SESSION_CANCELLED', data);
        disconnectSession();
      });
      
      // Action events from Lux
      socket.on('request_screenshot', () => {
        console.log('[Background] Screenshot requested');
        captureScreenshot();
      });
      
      socket.on('click', (data) => {
        console.log('[Background] Click action:', data);
        executeAction('click', data);
      });
      
      socket.on('type', (data) => {
        console.log('[Background] Type action:', data);
        executeAction('type', data);
      });
      
      socket.on('scroll', (data) => {
        console.log('[Background] Scroll action:', data);
        executeAction('scroll', data);
      });
      
      socket.on('keypress', (data) => {
        console.log('[Background] Keypress action:', data);
        executeAction('keypress', data);
      });
      
      socket.on('automation_complete', (data) => {
        console.log('[Background] Automation complete:', data);
        notifyPopup('AUTOMATION_COMPLETE', data);
        updateBadge('complete');
      });
      
      socket.on('error', (data) => {
        console.error('[Background] Error from server:', data);
        notifyPopup('ERROR', data);
        updateBadge('error');
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Disconnect from current session
 */
function disconnectSession() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentSessionId = null;
  serverUrl = null;
  updateBadge('idle');
}

/**
 * Capture screenshot of active tab
 */
async function captureScreenshot() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('[Background] No active tab found');
      return;
    }
    
    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90
    });
    
    // Extract base64 data
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    
    // Send to Lux Worker
    if (socket && socket.connected) {
      socket.emit('screenshot', { image: base64Data });
    }
    
  } catch (error) {
    console.error('[Background] Screenshot capture failed:', error);
    if (socket && socket.connected) {
      socket.emit('action_error', { message: 'Screenshot capture failed: ' + error.message });
    }
  }
}

/**
 * Execute an action via content script
 */
async function executeAction(type, data) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab');
    }
    
    // Send action to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_ACTION',
      action: type,
      data: data
    });
    
    if (response.success) {
      if (socket && socket.connected) {
        socket.emit('action_complete', { action: type, data });
      }
    } else {
      throw new Error(response.error || 'Action failed');
    }
    
  } catch (error) {
    console.error('[Background] Action execution failed:', error);
    if (socket && socket.connected) {
      socket.emit('action_error', { action: type, message: error.message });
    }
  }
}

/**
 * Update extension badge
 */
function updateBadge(status) {
  const badges = {
    'idle': { text: '', color: '#888888' },
    'connected': { text: '●', color: '#4CAF50' },
    'disconnected': { text: '○', color: '#FF9800' },
    'error': { text: '!', color: '#F44336' },
    'complete': { text: '✓', color: '#2196F3' }
  };
  
  const badge = badges[status] || badges['idle'];
  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

/**
 * Notify popup of events
 */
function notifyPopup(type, data) {
  chrome.runtime.sendMessage({ type, data }).catch(() => {
    // Popup might not be open
  });
}

/**
 * Load Socket.IO client library
 */
async function loadSocketIO() {
  // In a real extension, you'd bundle this or load from a local file
  // For now, we'll use a simple implementation
  console.log('[Background] Socket.IO client would be loaded here');
}

// Initialize
console.log('[Background] Tradeline Automation Client initialized');
updateBadge('idle');
