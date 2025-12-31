/**
 * Tradeline Automation Client - Popup Script
 * 
 * Handles UI interactions and communicates with background script.
 */

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const sessionIdDisplay = document.getElementById('session-id');
const serverUrlInput = document.getElementById('server-url');
const sessionInput = document.getElementById('session-input');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const connectForm = document.getElementById('connect-form');
const automationStatus = document.getElementById('automation-status');
const statusMessage = document.getElementById('status-message');
const messageContainer = document.getElementById('message-container');

// Load saved values
chrome.storage.local.get(['serverUrl', 'lastSessionId'], (result) => {
  if (result.serverUrl) {
    serverUrlInput.value = result.serverUrl;
  } else {
    // Default to production
    serverUrlInput.value = 'wss://tradelinerental.com/socket';
  }
  if (result.lastSessionId) {
    sessionInput.value = result.lastSessionId;
  }
});

// Check current status on popup open
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  if (response && response.connected) {
    showConnectedState(response.sessionId);
  }
});

// Connect button handler
connectBtn.addEventListener('click', async () => {
  const serverUrl = serverUrlInput.value.trim();
  const sessionId = sessionInput.value.trim();
  
  if (!serverUrl) {
    showMessage('Please enter the server URL', 'error');
    return;
  }
  
  if (!sessionId) {
    showMessage('Please enter the session ID', 'error');
    return;
  }
  
  // Save values
  chrome.storage.local.set({ serverUrl, lastSessionId: sessionId });
  
  // Update UI
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';
  
  try {
    const response = await sendMessage({
      type: 'CONNECT_SESSION',
      serverUrl,
      sessionId
    });
    
    if (response.success) {
      showConnectedState(sessionId);
      showMessage('Connected! Waiting for automation to start...', 'success');
    } else {
      showMessage('Connection failed: ' + response.error, 'error');
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect to Session';
    }
  } catch (error) {
    showMessage('Connection failed: ' + error.message, 'error');
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect to Session';
  }
});

// Disconnect button handler
disconnectBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'DISCONNECT_SESSION' });
  showDisconnectedState();
  showMessage('Disconnected from session', 'info');
});

// Listen for events from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Popup] Received:', message.type);
  
  switch (message.type) {
    case 'SESSION_READY':
      statusMessage.textContent = 'Session ready! Click Start to begin automation.';
      break;
      
    case 'SESSION_CANCELLED':
      showMessage('Session was cancelled by admin', 'error');
      showDisconnectedState();
      break;
      
    case 'AUTOMATION_COMPLETE':
      statusMessage.textContent = '✓ Automation completed successfully!';
      showMessage('Order submitted successfully!', 'success');
      break;
      
    case 'ERROR':
      statusMessage.textContent = 'Error: ' + message.data.message;
      showMessage(message.data.message, 'error');
      break;
  }
});

/**
 * Show connected state UI
 */
function showConnectedState(sessionId) {
  connectionStatus.textContent = 'Connected';
  connectionStatus.className = 'status-value connected';
  sessionIdDisplay.textContent = sessionId;
  
  connectForm.style.display = 'none';
  automationStatus.classList.add('active');
}

/**
 * Show disconnected state UI
 */
function showDisconnectedState() {
  connectionStatus.textContent = 'Disconnected';
  connectionStatus.className = 'status-value disconnected';
  sessionIdDisplay.textContent = '—';
  
  connectForm.style.display = 'block';
  automationStatus.classList.remove('active');
  
  connectBtn.disabled = false;
  connectBtn.textContent = 'Connect to Session';
}

/**
 * Show a message to the user
 */
function showMessage(text, type = 'info') {
  messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageContainer.innerHTML = '';
  }, 5000);
}

/**
 * Send message to background and await response
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
