# Tradeline Automation Browser Client

Chrome extension for connecting to the Lux automation system. This extension runs on the **Admin's machine** and executes browser actions as directed by the Lux AI.

## Installation

### Development (Load Unpacked)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `browser-client` folder
5. The extension icon should appear in your toolbar

### Required Files

Before loading, you need to add:

- **Socket.IO Client**: Download `socket.io.min.js` from CDN and place in `lib/` folder
- **Icons**: Create simple icons (16x16, 48x48, 128x128) or use any icon

```bash
# Create lib folder and download Socket.IO
mkdir lib
curl -o lib/socket.io.min.js https://cdn.socket.io/4.7.2/socket.io.min.js
```

## How to Use

### Pre-Automation (Human Steps)

1. **Log into TradelineSupply.com** in your Chrome browser
2. **Solve any CAPTCHA** if prompted
3. **Navigate to the order page** (https://tradelinesupply.com/pricing)
4. Keep this tab active

### Starting Automation

1. In the **Admin Dashboard**, find the order you want to fulfill
2. Click **"Start Automation"** - this creates a session ID
3. **Copy the Session ID** displayed
4. Click the **extension icon** in Chrome
5. Enter the **Server URL**: `wss://tradelinerental.com/lux`
6. Enter the **Session ID** you copied
7. Click **Connect**
8. Once connected, the Lux AI will take control

### During Automation

- The extension captures screenshots and sends them to Lux
- Lux analyzes the page and sends back actions (click, type, scroll)
- The extension executes each action on the page
- You can watch the automation happen in real-time

### Stopping Automation

- Click **"Stop & Disconnect"** in the extension popup
- Or click **Cancel Session** in the Admin Dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Chrome Browser (TradelineSupply.com Tab)               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Content Script (content.js)                      │  │
│  │  - Executes click/type/scroll on page             │  │
│  │  - Runs in the context of the webpage             │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↑                               │
│                          │                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Background Service Worker (background.js)        │  │
│  │  - Manages Socket.IO connection                   │  │
│  │  - Captures screenshots                           │  │
│  │  - Routes actions to content script               │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                               │
│                          │ WebSocket                     │
│                          ▼                               │
│              wss://tradelinerental.com/lux              │
└─────────────────────────────────────────────────────────┘
```

## Socket.IO Events

### Events FROM Server (Lux Worker)

| Event                 | Data                        | Description                 |
| --------------------- | --------------------------- | --------------------------- |
| `session_ready`       | `{session_id, instruction}` | Session connected           |
| `request_screenshot`  | `{}`                        | Capture and send screenshot |
| `click`               | `{x, y}`                    | Click at coordinates        |
| `type`                | `{text, x?, y?}`            | Type text                   |
| `scroll`              | `{direction, amount}`       | Scroll page                 |
| `keypress`            | `{key}`                     | Press a key                 |
| `automation_complete` | `{success, steps}`          | Automation finished         |
| `error`               | `{message}`                 | Error occurred              |

### Events TO Server

| Event              | Data                | Description           |
| ------------------ | ------------------- | --------------------- |
| `start_automation` | `{}`                | Begin automation      |
| `screenshot`       | `{image}`           | Base64 PNG screenshot |
| `action_complete`  | `{action, data}`    | Action executed       |
| `action_error`     | `{action, message}` | Action failed         |

## Security Notes

- **No credentials are stored** in the extension
- **Session tokens are single-use** and expire after completion
- **All communication uses TLS** (wss://)
- **CAPTCHA solving is always manual** (human-in-the-loop)

## Troubleshooting

### "No element found at coordinates"

The Lux AI might be looking at a different viewport size. Ensure:

- Browser window is maximized
- No dev tools open
- Zoom level is 100%

### "Connection failed"

- Check the server URL is correct
- Verify the session ID was copied correctly
- Ensure the VPS Lux Worker is running

### "Screenshot capture failed"

- Make sure the TradelineSupply tab is active
- Extension needs `activeTab` permission
- Try refreshing the page
