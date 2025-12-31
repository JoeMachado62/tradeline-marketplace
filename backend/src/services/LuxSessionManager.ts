/**
 * Lux Session Manager
 * 
 * Manages automation sessions between the Node.js app and the Lux Python worker.
 * Handles session lifecycle, status tracking, and communication.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './Database';

// Types
export interface OrderContext {
  orderId: string;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  clientDob?: string;
  items: Array<{
    cardId: string;
    bankName: string;
    creditLimit: number;
    price: number;
  }>;
  promoCode?: string;
  totalAmount: number;
}

export interface LuxSession {
  id: string;
  orderId: string;
  status: 'waiting' | 'connected' | 'running' | 'completed' | 'failed' | 'cancelled';
  instruction: string;
  context: OrderContext;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  result?: any;
}

export interface StartAutomationResult {
  success: boolean;
  sessionId?: string;
  socketUrl?: string;
  error?: string;
}

// Configuration
const LUX_WORKER_URL = process.env.LUX_WORKER_URL || 'http://localhost:8765';
const LUX_SOCKET_URL = process.env.LUX_SOCKET_URL || 'ws://localhost:8765';

// In-memory session storage (can be moved to Redis for persistence)
const activeSessions: Map<string, LuxSession> = new Map();

/**
 * Build automation instruction for TradelineSupply.com
 */
function buildInstruction(context: OrderContext): string {
  const cardIds = context.items.map(item => item.cardId).join(', ');
  const nameParts = context.clientName.split(' ');
  const firstName = nameParts[0] || 'Client';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  return `
You are completing an order on TradelineSupply.com. The browser is already logged in.

**ORDER DETAILS:**
- Order Number: ${context.orderNumber}
- Client: ${context.clientName} (${context.clientEmail})
- Card IDs to order: [${cardIds}]
- Promo Code: ${context.promoCode || 'PKGDEAL'}
- Total Expected: $${context.totalAmount.toFixed(2)}

**STEP 1: ADD TRADELINES TO CART**
For each Card ID (${cardIds}):
1. Go to the pricing page if not already there
2. Find the Card ID filter input
3. Enter the Card ID and apply filter
4. Click "Add to Cart" for the matching tradeline
5. Clear filter and repeat for remaining Card IDs

**STEP 2: APPLY PROMO CODE**
1. Go to Cart page
2. Enter promo code: ${context.promoCode || 'PKGDEAL'}
3. Click Apply Coupon
4. Verify discount is applied

**STEP 3: CHECKOUT**
1. Click Proceed to Checkout
2. Fill in client details:
   - First Name: ${firstName}
   - Last Name: ${lastName}
   - Email: ${context.clientEmail}
   - Phone: ${context.clientPhone || ''}
   - Address: ${context.clientAddress || ''}
3. Review order totals

**STEP 4: SUBMIT ORDER**
1. Review all information
2. Click Place Order / Submit
3. Wait for confirmation
4. Note the order confirmation number

**IMPORTANT:**
- Do NOT automate login or CAPTCHA
- Stop if you encounter any payment requirement
- Report any errors immediately
`.trim();
}

/**
 * Lux Session Manager Class
 */
class LuxSessionManager {
  /**
   * Start a new automation session for an order
   */
  async startSession(orderId: string): Promise<StartAutomationResult> {
    try {
      // Fetch order with all details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          client: true,
        },
      });

      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Build context
      const context: OrderContext = {
        orderId: order.id,
        orderNumber: order.order_number,
        clientName: order.client?.name || order.customer_name,
        clientEmail: order.client?.email || order.customer_email,
        clientPhone: order.client?.phone || order.customer_phone || undefined,
        clientAddress: order.client?.address || undefined,
        clientDob: order.client?.date_of_birth?.toISOString().split('T')[0],
        items: order.items.map((item: any) => ({
          cardId: item.card_id,
          bankName: item.bank_name,
          creditLimit: item.credit_limit,
          price: item.customer_price / 100, // Convert cents to dollars
        })),
        promoCode: (order as any).promo_code || 'PKGDEAL',
        totalAmount: order.total_charged / 100,
      };

      // Generate session ID
      const sessionId = `lux_${uuidv4().substring(0, 8)}`;

      // Build instruction
      const instruction = buildInstruction(context);

      // Create session in Lux Worker
      const response = await axios.post(`${LUX_WORKER_URL}/sessions`, {
        session_id: sessionId,
        order_id: orderId,
        instruction,
        context,
      });

      if (response.status !== 200) {
        return { success: false, error: 'Failed to create session in Lux Worker' };
      }

      // Register namespace
      await axios.post(`${LUX_WORKER_URL}/sessions/${sessionId}/register-namespace`);

      // Store session locally
      const session: LuxSession = {
        id: sessionId,
        orderId,
        status: 'waiting',
        instruction,
        context,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      activeSessions.set(sessionId, session);

      // Update order with automation session info
      await prisma.activityLog.create({
        data: {
          action: 'LUX_SESSION_CREATED',
          entity_type: 'Order',
          entity_id: orderId,
          metadata: JSON.stringify({
            sessionId,
            cardIds: context.items.map(i => i.cardId),
          }),
        },
      });

      console.log(`🤖 Created Lux session ${sessionId} for order ${order.order_number}`);

      return {
        success: true,
        sessionId,
        socketUrl: `${LUX_SOCKET_URL}/session/${sessionId}`,
      };

    } catch (error: any) {
      console.error('Failed to start Lux session:', error);
      return {
        success: false,
        error: error.message || 'Failed to start automation session',
      };
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<LuxSession | null> {
    // Check local cache first
    if (activeSessions.has(sessionId)) {
      // Also fetch from worker for latest status
      try {
        const response = await axios.get(`${LUX_WORKER_URL}/sessions/${sessionId}`);
        const workerSession = response.data;
        
        // Update local cache
        const localSession = activeSessions.get(sessionId)!;
        localSession.status = workerSession.status;
        localSession.updatedAt = new Date();
        if (workerSession.error) localSession.error = workerSession.error;
        
        return localSession;
      } catch {
        return activeSessions.get(sessionId) || null;
      }
    }
    return null;
  }

  /**
   * Cancel an active session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    try {
      await axios.delete(`${LUX_WORKER_URL}/sessions/${sessionId}`);
      
      const session = activeSessions.get(sessionId);
      if (session) {
        session.status = 'cancelled';
        session.updatedAt = new Date();
      }
      
      console.log(`🛑 Cancelled Lux session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel session:', error);
      return false;
    }
  }

  /**
   * Handle callback from Lux Worker when session completes
   */
  async handleSessionCallback(sessionId: string, status: string, result?: any, error?: string): Promise<void> {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.status = status as LuxSession['status'];
    session.updatedAt = new Date();
    session.result = result;
    session.error = error;

    // Log the result
    await prisma.activityLog.create({
      data: {
        action: status === 'completed' ? 'LUX_AUTOMATION_SUCCESS' : 'LUX_AUTOMATION_FAILED',
        entity_type: 'Order',
        entity_id: session.orderId,
        metadata: JSON.stringify({
          sessionId,
          status,
          result,
          error,
        }),
      },
    });

    console.log(`📋 Lux session ${sessionId} ${status}:`, result || error);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): LuxSession[] {
    return Array.from(activeSessions.values());
  }

  /**
   * Check if Lux Worker is healthy
   */
  async checkWorkerHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${LUX_WORKER_URL}/health`);
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Singleton instance
let sessionManagerInstance: LuxSessionManager | null = null;

export function getLuxSessionManager(): LuxSessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new LuxSessionManager();
  }
  return sessionManagerInstance;
}

export default LuxSessionManager;
