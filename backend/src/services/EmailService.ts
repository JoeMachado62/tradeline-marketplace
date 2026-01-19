import nodemailer from "nodemailer";
import { config } from "../config";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // True for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${config.email.from}" <${config.email.from}>`,
        to,
        subject,
        html,
      });
      console.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  async sendPasswordReset(email: string, token: string) {
    const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";
    const link = `${baseUrl}/client-portal/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #032530; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">🔐 Password Reset Request</h1>
        </div>
        <div style="padding: 30px; background: #ffffff;">
          <p>You requested a password reset for your TradelineRental.com account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${link}" 
               style="background: #032530; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        </div>
      </div>
    `;
    await this.sendEmail(email, "🔐 Password Reset - TradelineRental.com", html);
  }

  async sendOrderConfirmation(order: any) {
    const itemsList = order.items.map((item: any) =>
      `<li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${item.bank_name} - $${(item.customer_price / 100).toFixed(2)}</li>`
    ).join('');

    const baseUrl = process.env.PUBLIC_URL || "https://tradelinerental.com";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #032530; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Order Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${order.order_number}</p>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p style="font-size: 18px; color: #333;">Thank you for your order, <strong>${order.customer_name}</strong>!</p>
          
          <p style="color: #666; line-height: 1.6;">
            Your tradeline order has been received and is being processed. Our team will review your documents 
            and begin adding you as an authorized user to your selected tradelines.
          </p>
          
          <div style="background: #fffbeb; border: 2px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; color: #92400e;">⚠️ Action Required: Complete Payment</h3>
            <p style="color: #92400e; margin: 0 0 10px 0;"><strong>Your order is NOT active yet.</strong></p>
            <p style="color: #92400e; margin: 0;">
              Please complete your payment via <strong>Zelle</strong> or <strong>ACH</strong> immediately and notify us. 
              Tradelines are <strong>NOT reserved</strong> until 24 hours after payment is received. 
              Availability is not guaranteed—time is of the essence!
            </p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #032530;">Order Details:</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">${itemsList}</ul>
            <div style="border-top: 2px solid #032530; margin-top: 15px; padding-top: 15px; text-align: right;">
              <strong style="font-size: 18px; color: #032530;">Total: $${(order.total_charged / 100).toFixed(2)}</strong>
            </div>
          </div>
          
          <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="margin: 0 0 10px 0; color: #166534;">📋 What Happens Next?</h4>
            <ol style="margin: 0; padding-left: 20px; color: #166534; line-height: 1.8;">
              <li><strong>You complete payment via Zelle or ACH</strong></li>
              <li>Our team confirms receipt and reserves your tradelines</li>
              <li>We upload your information to the card issuers</li>
              <li>You'll receive email updates as your order progresses</li>
            </ol>
          </div>
          
          <p style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}/client-portal" 
               style="background: #032530; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Track Your Order
            </a>
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p style="margin: 0;">Questions? Reply to this email or contact us at support@tradelinerental.com</p>
        </div>
      </div>
    `;
    await this.sendEmail(order.customer_email, `✅ Order Confirmed #${order.order_number}`, html);
  }

  async sendNewOrderAdminNotification(order: any) {
    const itemsList = order.items.map((item: any) =>
      `<li>${item.bank_name} - ${item.quantity}x - $${(item.customer_price / 100).toFixed(2)}</li>`
    ).join('');

    const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #032530; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🎉 New Order Received!</h1>
        </div>
        <div style="padding: 20px; background: #f8fafc;">
          <p><strong>Order Number:</strong> ${order.order_number}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Email:</strong> ${order.customer_email}</p>
          <p><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
          <p><strong>Total:</strong> $${(order.total_charged / 100).toFixed(2)}</p>
          <h3>Items:</h3>
          <ul>${itemsList}</ul>
          <p style="margin-top: 20px;">
            <a href="${baseUrl}/admin-portal/orders" 
               style="background: #032530; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Admin Portal
            </a>
          </p>
        </div>
      </div>
    `;
    await this.sendEmail(config.email.adminEmail, `🆕 New Order #${order.order_number}`, html);
  }

  async sendPaymentConfirmation(order: any) {
    const html = `
      <h1>Payment Confirmed!</h1>
      <p>We have received your payment for Order #${order.order_number}.</p>
      <p>We are now proceeding with the fulfillment of your tradelines.</p>
      <p>Total Paid: $${(order.total_charged / 100).toFixed(2)}</p>
    `;
    await this.sendEmail(order.customer_email, `Payment Confirmed - Order #${order.order_number}`, html);
  }

  async sendOrderFulfilled(order: any) {
    const html = `
     <h1>Order Fulfilled!</h1>
     <p>Good news! Your order #${order.order_number} has been fulfilled.</p>
     <p>The tradelines have been added to your file.</p>
     <p>Thank you for choosing us.</p>
   `;
    await this.sendEmail(order.customer_email, `Order Fulfilled - #${order.order_number}`, html);
  }

  async sendContactFormSubmission(data: { firstName: string; lastName: string; email: string; phone: string; subject: string; message: string }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #032530; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">📬 New Contact Form Submission</h1>
        </div>
        <div style="padding: 20px; background: #f8fafc;">
          <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #e2e8f0;">${data.message}</p>
        </div>
      </div>
    `;
    await this.sendEmail("support@tradelinerental.com", `Contact Form: ${data.subject}`, html);
  }

  async sendBrokerWelcome(broker: any, password: string) {
    const baseUrl = process.env.PUBLIC_URL || "https://tradelinerental.com";
    const loginLink = `${baseUrl}/broker-portal`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #032530; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Tradeline Rental!</h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${broker.name}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            We are excited to have you on board! Your broker account has been successfully created. 
            Below you will find your login credentials and some helpful information to get you started.
          </p>
          
          <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: #032530; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">🔑 Your Login Credentials</h3>
            <p style="margin: 5px 0;"><strong>URL:</strong> <a href="${loginLink}">${loginLink}</a></p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${broker.email}</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; rounded: 4px;">${password}</span></p>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;"><em>Please change your password after your first login for security.</em></p>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" 
               style="background: #F4D445; color: #032530; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              Log In to Broker Portal
            </a>
          </p>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="margin: 0 0 10px 0; color: #166534;">🚀 Getting Started</h3>
            
            <h4 style="margin: 15px 0 5px 0; color: #166534;">1. Dashboard Overview</h4>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #333;">
              Once logged in, you'll see your main dashboard where you can track your earnings, monitor orders, and view available payouts.
            </p>

            <h4 style="margin: 15px 0 5px 0; color: #166534;">2. Install Your Widget</h4>
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #333;">
              Go to the <strong>Settings</strong> tab to find your unique API Key and the embed code for your website. 
              Adding this widget to your site allows your clients to browse and purchase tradelines directly!
            </p>
            
            <h4 style="margin: 15px 0 5px 0; color: #166534;">3. Set Your Password</h4>
            <p style="margin: 0 0 0 0; font-size: 14px; color: #333;">
              For security, navigate to the <strong>Settings</strong> tab and update your password to something only you know.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            If you have any questions or need assistance setting up your widget, please simply reply to this email.
          </p>
          
          <p style="margin-top: 30px; color: #333;">
            Best regards,<br>
            <strong>The Tradeline Rental Team</strong>
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Tradeline Rental. All rights reserved.</p>
        </div>
      </div>
    `;
    await this.sendEmail(broker.email, "Welcome to Tradeline Rental! 🚀Credentials Inside", html);
  }
}

// Singleton
let emailServiceInstance: EmailService | null = null;
export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
