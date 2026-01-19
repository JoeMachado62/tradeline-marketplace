/**
 * Fundalytics Embed Widget
 * Add this script to any website to embed a lead intake form
 * 
 * Usage:
 * <script src="https://myfundalytics.com/embed-widget.js" 
 *   data-consultant-id="your-consultant-id"
 *   data-button-text="Apply for Funding"
 *   data-button-color="#1a56db"
 *   data-mode="popup"
 *   data-position="bottom-right">
 * </script>
 */
(function() {
  'use strict';

  // Get script element and configuration
  const currentScript = document.currentScript;
  const config = {
    consultantId: currentScript?.getAttribute('data-consultant-id') || '',
    buttonText: currentScript?.getAttribute('data-button-text') || 'Apply for Funding',
    buttonColor: currentScript?.getAttribute('data-button-color') || '#1a56db',
    mode: currentScript?.getAttribute('data-mode') || 'popup', // 'popup' or 'inline'
    position: currentScript?.getAttribute('data-position') || 'bottom-right', // 'bottom-right' or 'bottom-left'
    target: currentScript?.getAttribute('data-target') || null, // CSS selector for inline mode
  };

  // Get base URL from script src
  const scriptSrc = currentScript?.src || '';
  const baseUrl = scriptSrc.replace('/embed-widget.js', '') || 'https://myfundalytics.com';
  const iframeUrl = `${baseUrl}/embed/intake?consultant=${config.consultantId}`;

  // Styles
  const styles = `
    .fw-widget-button {
      position: fixed;
      ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      background-color: ${config.buttonColor};
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .fw-widget-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
    .fw-widget-button:active {
      transform: translateY(0);
    }
    .fw-widget-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .fw-widget-overlay.active {
      display: flex;
    }
    .fw-widget-modal {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow: hidden;
      position: relative;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    }
    .fw-widget-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      transition: background 0.2s;
    }
    .fw-widget-close:hover {
      background: rgba(0, 0, 0, 0.2);
    }
    .fw-widget-close svg {
      width: 18px;
      height: 18px;
    }
    .fw-widget-iframe {
      width: 100%;
      height: 80vh;
      max-height: 700px;
      border: none;
    }
    .fw-widget-inline {
      width: 100%;
      border: none;
      min-height: 600px;
    }
  `;

  // Inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create widget based on mode
  if (config.mode === 'inline' && config.target) {
    // Inline mode
    const targetElement = document.querySelector(config.target);
    if (targetElement) {
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.className = 'fw-widget-inline';
      iframe.title = 'Funding Application Form';
      targetElement.appendChild(iframe);
    }
  } else {
    // Popup mode (default)
    // Create button
    const button = document.createElement('button');
    button.className = 'fw-widget-button';
    button.textContent = config.buttonText;
    button.setAttribute('aria-label', 'Open funding application form');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'fw-widget-overlay';
    overlay.innerHTML = `
      <div class="fw-widget-modal">
        <button class="fw-widget-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <iframe src="${iframeUrl}" class="fw-widget-iframe" title="Funding Application Form"></iframe>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(button);
    document.body.appendChild(overlay);

    // Event handlers
    button.addEventListener('click', () => {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    overlay.querySelector('.fw-widget-close').addEventListener('click', () => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      // Verify origin
      if (!event.origin.includes('myfundalytics.com') && !event.origin.includes('lovable.app') && !event.origin.includes('localhost')) {
        return;
      }

      if (event.data.type === 'FUNDALYTICS_FORM_SUBMITTED') {
        // Close modal after delay
        setTimeout(() => {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }, 3000);
      }
    });
  }

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.querySelector('.fw-widget-overlay.active');
      if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });
})();
