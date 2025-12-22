# Deployment Guide for Tradeline Marketplace

Your application consists of two parts that need to be deployed:

1.  **Backend API** (Node.js + Database)
2.  **Frontend Widget** (Vue.js)

## Part 1: Backend Deployment (Required)

The backend handles payments, payments, and AI processing. It cannot run on standard shared WordPress hosting. You need a VPS or Cloud Platform.

### Option A: Deploy on Railway / Render (Easiest)

1.  Push your `backend` folder to a GitHub repository.
2.  Connect the repo to **Railway.app** or **Render.com**.
3.  Add a **PostgreSQL** database service (usually 1-click add).
4.  Configure Environment Variables in the dashboard:
    - `DATABASE_URL`: Connection string from your new database.
    - `STRIPE_SECRET_KEY`: Your Stripe Secret Key.
    - `STRIPE_WEBHOOK_SECRET`: Your Stripe Webhook Signing Secret.
    - `GEMINI_API_KEY`: Your Google Gemini API Key.
    - `GEMINI_MODEL`: `gemini-3-flash-preview`
    - `TRADELINE_CONSUMER_KEY` & `SECRET`: Your TradelineSupply keys.
    - `JWT_SECRET`: A random long string for security.

### Option B: VPS (DigitalOcean, Linode)

1.  Rent a server (Ubuntu 22.04).
2.  Install Docker and Docker Compose.
3.  Copy the `backend` folder to the server.
4.  Run `docker build -t tradeline-api .`
5.  Run the container mapping port 3000.

---

## Part 2: Frontend Widget Deployment (WordPress)

The widget is a static Javascript application that talks to your new Backend.

### Step 1: Prepare the Files

1.  Navigate to the `widget` folder.
2.  Run `npm run build`.
3.  This creates a `dist` folder containing:
    - `index.html`
    - `assets/` (CSS and JS files)

### Step 2: Upload to WordPress

You can replace your existing `index.php` functionality with this widget.

1.  **Upload Assets**: Upload the `dist/assets` folder to your server where `index.php` is located.
2.  **Create Entry Page**: You can rename `dist/index.html` to `index.php` (if it's a standalone page) OR include the script tags in your WordPress page header.

**Integration Code Snippet:**
Place this wherever you want the widget to appear:

```html
<div id="app"></div>
<link rel="stylesheet" href="./assets/index-YOUR_HASH.css" />
<script type="module" src="./assets/index-YOUR_HASH.js"></script>
<script>
  // Configure the widget to talk to your new backend
  window.TL_WIDGET_CONFIG = {
    apiKey: "YOUR_BROKER_API_KEY",
    apiUrl: "https://your-new-backend-url.com/api",
  };
</script>
```

_(Note: You must replace `YOUR_HASH` with the actual filenames generated in the `dist/assets` folder)_

## Part 3: Connecting Them

1.  Once Backend is live, copy its URL (e.g., `https://api.myapp.com`).
2.  In the Frontend code (or `stores/widget.ts` before building), ensure the API URL points to this live backend.
    - _Pro Tip_: You can pass the API URL in the window config as shown above to avoid rebuilding for every URL change.
