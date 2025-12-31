/**
 * Lux Automation API Routes
 * 
 * Endpoints for managing browser automation sessions.
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { getLuxSessionManager } from '../services/LuxSessionManager';

const router = Router();
const sessionManager = getLuxSessionManager();

/**
 * GET /api/lux/health
 * Check if Lux Worker is available
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const healthy = await sessionManager.checkWorkerHealth();
    res.json({
      success: true,
      luxWorker: healthy ? 'healthy' : 'unavailable',
      activeSessions: sessionManager.getActiveSessions().length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      luxWorker: 'error',
      error: error.message,
    });
  }
});

/**
 * POST /api/lux/sessions
 * Start a new automation session for an order (Admin only)
 */
router.post('/sessions', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ success: false, error: 'orderId is required' });
      return;
    }

    const result = await sessionManager.startSession(orderId);

    if (result.success) {
      res.json({
        success: true,
        sessionId: result.sessionId,
        socketUrl: result.socketUrl,
        message: 'Automation session created. Connect browser extension to start.',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start session',
    });
  }
});

/**
 * GET /api/lux/sessions
 * List all active sessions (Admin only)
 */
router.get('/sessions', authenticateAdmin, async (_req: Request, res: Response) => {
  try {
    const sessions = sessionManager.getActiveSessions();
    res.json({
      success: true,
      sessions,
      total: sessions.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/lux/sessions/:sessionId
 * Get session status (Admin only)
 */
router.get('/sessions/:sessionId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionManager.getSessionStatus(sessionId);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, session });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/lux/sessions/:sessionId
 * Cancel an active session (Admin only)
 */
router.delete('/sessions/:sessionId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const cancelled = await sessionManager.cancelSession(sessionId);

    if (cancelled) {
      res.json({ success: true, message: 'Session cancelled' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to cancel session' });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/lux/callback
 * Callback endpoint for Lux Worker to report session status
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { session_id, status, result, error } = req.body;

    await sessionManager.handleSessionCallback(session_id, status, result, error);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Lux callback error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
