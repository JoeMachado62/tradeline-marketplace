"""
LUX Fulfillment Bot - Automated Order Entry for TradelineSupply.com

This script uses the OAGI Python SDK (Lux Computer Use model) to automatically
place orders on the supplier website when an admin marks an order as paid.

Usage:
    python lux_bot.py --order-id <id> --card-ids <id1,id2,...> --client-name <name> --client-email <email>

Environment Variables Required:
    OAGI_API_KEY - Your OpenAGI API key from https://developer.agiopen.org/
    TRADELINE_BROKER_LOGIN_URL - Login URL for TradelineSupply.com
    TRADELINE_BROKER_LOGIN_ID - Your broker email
    TRADELINE_BROKER_PASSWORD - Your broker password
    TRADELINE_ORDERS_URL - URL to the pricing/ordering page
"""

import os
import sys
import json
import asyncio
import argparse
import logging
from typing import List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import OAGI SDK
try:
    from oagi import (
        AsyncDefaultAgent,
        AsyncPyautoguiActionHandler,
        AsyncScreenshotMaker,
        PyautoguiConfig
    )
    OAGI_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import OAGI SDK: {e}")
    logger.error("Please install with: pip install oagi")
    OAGI_AVAILABLE = False


def build_task_instruction(
    card_ids: List[str],
    client_name: str,
    client_email: str,
    promo_code: str = "PKGDEAL",
    login_url: Optional[str] = None,
    orders_url: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None
) -> str:
    """
    Build a detailed natural language instruction for the LUX agent.
    
    The Lux model excels at understanding complex, multi-step instructions
    and executing them with precision on the desktop.
    """
    
    login_url = login_url or os.getenv("TRADELINE_BROKER_LOGIN_URL", "https://tradelinesupply.com/login-create-an-account/")
    orders_url = orders_url or os.getenv("TRADELINE_ORDERS_URL", "https://tradelinesupply.com/pricing")
    username = username or os.getenv("TRADELINE_BROKER_LOGIN_ID")
    password = password or os.getenv("TRADELINE_BROKER_PASSWORD")
    
    # Build the card IDs list for the instruction
    card_list = ", ".join(card_ids)
    
    instruction = f"""
You are placing an order on TradelineSupply.com for a client. The browser already has an active login session (Remember Me cookie), so skip login and go directly to the ordering page.

**STEP 1: GO TO TRADELINES PAGE**
1. Open the browser and navigate directly to: {orders_url}
2. Wait for the page to fully load - you should see a table of tradelines with columns like Bank Name, Card ID, Credit Limit, etc.

**STEP 2: ADD TRADELINES TO CART**
For EACH of the following Card IDs, you need to add them to the cart: [{card_list}]

For each Card ID:
1. Look for a filter/search section on the page
2. Find the "Card ID" input field (there should be a text input under or near "Card ID" column header)
3. Type the Card ID number: {card_ids[0] if card_ids else ''}
4. Press Enter or click "Apply Filters" button (yellow button)
5. Wait for the table to filter and show results
6. Find the row with the matching Card ID
7. Click the orange/yellow "Add to Cart" button on that row
8. Wait for confirmation (cart icon may update)
9. Clear the filter and repeat for any remaining Card IDs

**STEP 3: VIEW CART AND APPLY PROMO CODE**
1. Click on the Cart icon (usually top right, may show item count)
2. Or navigate to: https://tradelinesupply.com/cart/
3. On the cart page, find the "Coupon code" input field
4. Enter the promo code: {promo_code}
5. Click "Apply Coupon" button
6. Verify the discount is applied (you should see price reduction)

**STEP 4: PROCEED TO CHECKOUT**
1. Click "Proceed to Checkout" button
2. On the checkout page, enter client billing details:
   - First Name: {client_name.split()[0] if client_name else 'Test'}
   - Last Name: {' '.join(client_name.split()[1:]) if len(client_name.split()) > 1 else 'Client'}
   - Email: {client_email}
   - Fill in any other required fields (address, phone, etc.)

**STEP 5: REVIEW AND SUBMIT**
1. Review the order totals
2. Select payment method if required (this is a test - order won't process without real payment)
3. Click "Place Order" or "Complete Order" button
4. Wait for confirmation page
5. Note any order number displayed

**IMPORTANT:**
- You are ALREADY LOGGED IN - do NOT go to login page
- If you see "My Account" or your username in header, you're logged in
- The promo code "PKGDEAL" gives discounts on multiple tradelines
- If a tradeline shows "Out of Stock", skip it and continue
- Work step by step, verify each action completed before proceeding
"""
    
    return instruction.strip()


async def run_lux_agent(
    order_id: str,
    card_ids: List[str],
    client_name: str,
    client_email: str,
    promo_code: str = "PKGDEAL",
    max_steps: int = 50
) -> dict:
    """
    Execute the order fulfillment task using the LUX agent.
    
    Args:
        order_id: Internal order ID for tracking
        card_ids: List of Card IDs to order
        client_name: Client's full name
        client_email: Client's email
        promo_code: Promo code to apply
        max_steps: Maximum number of agent steps
    
    Returns:
        dict with success status and details
    """
    
    if not OAGI_AVAILABLE:
        return {
            "success": False,
            "error": "OAGI SDK not available",
            "order_id": order_id
        }
    
    # Check for API key
    api_key = os.getenv("OAGI_API_KEY")
    if not api_key:
        return {
            "success": False,
            "error": "Missing OAGI_API_KEY environment variable",
            "order_id": order_id
        }
    
    logger.info(f"🤖 Starting LUX Agent for Order {order_id}")
    logger.info(f"   Card IDs: {card_ids}")
    logger.info(f"   Client: {client_name} ({client_email})")
    
    try:
        # Build the task instruction
        instruction = build_task_instruction(
            card_ids=card_ids,
            client_name=client_name,
            client_email=client_email,
            promo_code=promo_code
        )
        
        logger.info("📋 Task instruction built successfully")
        
        # Configure the action handler with appropriate settings
        # Slower actions for more reliable execution on the web
        config = PyautoguiConfig(
            drag_duration=0.5,
            scroll_amount=30,
            wait_duration=1.5,      # Wait a bit longer between actions
            action_pause=0.3,       # Pause between actions
            hotkey_interval=0.1,
            capslock_mode="session"
        )
        
        # Create the agent and handlers
        agent = AsyncDefaultAgent(max_steps=max_steps)
        action_handler = AsyncPyautoguiActionHandler(config=config)
        image_provider = AsyncScreenshotMaker()
        
        logger.info("🚀 Executing task with LUX agent...")
        
        # Execute the task
        completed = await agent.execute(
            instruction,
            action_handler=action_handler,
            image_provider=image_provider
        )
        
        if completed:
            logger.info(f"✅ LUX Agent completed successfully for Order {order_id}")
            return {
                "success": True,
                "order_id": order_id,
                "card_ids": card_ids,
                "message": "Order fulfillment completed"
            }
        else:
            logger.warning(f"⚠️ LUX Agent did not complete (max steps reached) for Order {order_id}")
            return {
                "success": False,
                "order_id": order_id,
                "error": "Agent reached max steps without completing",
                "card_ids": card_ids
            }
            
    except Exception as e:
        logger.error(f"❌ LUX Agent error for Order {order_id}: {str(e)}")
        return {
            "success": False,
            "order_id": order_id,
            "error": str(e),
            "card_ids": card_ids
        }


def main():
    parser = argparse.ArgumentParser(
        description='LUX Fulfillment Bot - Automated Order Entry for TradelineSupply.com'
    )
    parser.add_argument('--order-id', required=True, help='Internal order ID')
    parser.add_argument('--card-ids', required=True, help='Comma-separated Card IDs to order')
    parser.add_argument('--client-name', required=True, help='Client full name')
    parser.add_argument('--client-email', required=True, help='Client email')
    parser.add_argument('--promo-code', default='PKGDEAL', help='Promo code to apply')
    parser.add_argument('--max-steps', type=int, default=50, help='Maximum agent steps')
    
    args = parser.parse_args()
    
    # Parse card IDs
    card_ids = [cid.strip() for cid in args.card_ids.split(',') if cid.strip()]
    
    if not card_ids:
        logger.error("No valid Card IDs provided")
        sys.exit(1)
    
    # Run the agent
    result = asyncio.run(run_lux_agent(
        order_id=args.order_id,
        card_ids=card_ids,
        client_name=args.client_name,
        client_email=args.client_email,
        promo_code=args.promo_code,
        max_steps=args.max_steps
    ))
    
    # Output result as JSON for the calling process
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
