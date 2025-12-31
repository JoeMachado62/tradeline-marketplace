/**
 * Tradeline Automation Client - Content Script
 * 
 * Executes actions on the TradelineSupply.com page as directed by the Lux Worker.
 */

console.log('[Content] Tradeline Automation Client loaded on:', window.location.href);

// Listen for action commands from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'EXECUTE_ACTION') {
    return;
  }
  
  console.log('[Content] Executing action:', message.action, message.data);
  
  try {
    switch (message.action) {
      case 'click':
        executeClick(message.data);
        sendResponse({ success: true });
        break;
        
      case 'type':
        executeType(message.data);
        sendResponse({ success: true });
        break;
        
      case 'scroll':
        executeScroll(message.data);
        sendResponse({ success: true });
        break;
        
      case 'keypress':
        executeKeypress(message.data);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action: ' + message.action });
    }
  } catch (error) {
    console.error('[Content] Action error:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Async response
});

/**
 * Execute a click at the given coordinates
 */
function executeClick(data) {
  const { x, y } = data;
  
  // Find element at coordinates
  const element = document.elementFromPoint(x, y);
  
  if (!element) {
    throw new Error(`No element found at (${x}, ${y})`);
  }
  
  console.log('[Content] Clicking element:', element.tagName, element.className);
  
  // Simulate mouse events
  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  });
  
  // Focus first if it's an input
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
    element.focus();
  }
  
  element.dispatchEvent(clickEvent);
  
  // Also try native click for links and buttons
  if (element.click) {
    element.click();
  }
}

/**
 * Type text into the currently focused element or at coordinates
 */
function executeType(data) {
  const { text, x, y } = data;
  
  let element = document.activeElement;
  
  // If coordinates provided, click there first
  if (x !== undefined && y !== undefined) {
    const targetElement = document.elementFromPoint(x, y);
    if (targetElement) {
      targetElement.focus();
      element = targetElement;
    }
  }
  
  if (!element || element === document.body) {
    throw new Error('No element focused for typing');
  }
  
  console.log('[Content] Typing into:', element.tagName, 'Text:', text.substring(0, 20) + '...');
  
  // Clear existing value if it's an input
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.value = '';
  }
  
  // Type character by character for realism
  for (const char of text) {
    // KeyDown event
    const keyDownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(keyDownEvent);
    
    // Input event (for React/Vue controlled inputs)
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value += char;
      
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
    }
    
    // KeyUp event
    const keyUpEvent = new KeyboardEvent('keyup', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(keyUpEvent);
  }
  
  // Trigger change event
  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);
}

/**
 * Scroll the page
 */
function executeScroll(data) {
  const { direction, amount } = data;
  const scrollAmount = (amount || 3) * 100; // Convert to pixels
  
  let deltaX = 0;
  let deltaY = 0;
  
  switch (direction) {
    case 'up':
      deltaY = -scrollAmount;
      break;
    case 'down':
      deltaY = scrollAmount;
      break;
    case 'left':
      deltaX = -scrollAmount;
      break;
    case 'right':
      deltaX = scrollAmount;
      break;
  }
  
  console.log('[Content] Scrolling:', direction, 'by', scrollAmount, 'px');
  
  window.scrollBy({
    left: deltaX,
    top: deltaY,
    behavior: 'smooth'
  });
}

/**
 * Execute a keypress (special keys)
 */
function executeKeypress(data) {
  const { key } = data;
  
  const element = document.activeElement || document.body;
  
  console.log('[Content] Keypress:', key);
  
  const keyMap = {
    'enter': { key: 'Enter', code: 'Enter' },
    'tab': { key: 'Tab', code: 'Tab' },
    'escape': { key: 'Escape', code: 'Escape' },
    'backspace': { key: 'Backspace', code: 'Backspace' },
    'delete': { key: 'Delete', code: 'Delete' },
    'arrowup': { key: 'ArrowUp', code: 'ArrowUp' },
    'arrowdown': { key: 'ArrowDown', code: 'ArrowDown' },
    'arrowleft': { key: 'ArrowLeft', code: 'ArrowLeft' },
    'arrowright': { key: 'ArrowRight', code: 'ArrowRight' }
  };
  
  const keyInfo = keyMap[key.toLowerCase()] || { key: key, code: key };
  
  const keyDownEvent = new KeyboardEvent('keydown', {
    key: keyInfo.key,
    code: keyInfo.code,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(keyDownEvent);
  
  const keyUpEvent = new KeyboardEvent('keyup', {
    key: keyInfo.key,
    code: keyInfo.code,
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(keyUpEvent);
}

// Announce that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY', url: window.location.href });
