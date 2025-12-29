# Tradeline Marketplace Platform

A white-label multi-tenant platform for selling tradelines with advanced commission management.

## 🚀 Features

- **Multi-Tenant Architecture**: Support unlimited brokers with individual pricing
- **Advanced Commission System**:
  - Platform receives 50% commission from TradelineSupply prices
  - Brokers get 10-25% revenue share (admin-controlled)
  - Brokers can add unlimited markup (broker-controlled)
- **Embeddable Widget**: Single-line embed code for broker websites
- **Automated Fulfillment**: Direct integration with TradelineSupply
- **Payment Processing**: Stripe checkout with webhook handling
- **Analytics Dashboard**: Real-time metrics for brokers and admins
- **Commission Payouts**: Automated monthly payout system

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
- Stripe Account
- TradelineSupply API Credentials

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/tradeline-marketplace.git
cd tradeline-marketplace
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Deploy with Docker**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

4. **Access the platform**

- API: http://api.tradelinerental.com
- Widget: http://widget.tradelinerental.com

## 💰 Commission Structure

| Component            | Percentage | Description                   |
| -------------------- | ---------- | ----------------------------- |
| TradelineSupply      | 50%        | Base cost (built into prices) |
| Platform Commission  | 50%        | Your gross commission         |
| Broker Revenue Share | 10-25%     | From platform commission      |
| Platform Net         | 25-40%     | After broker share            |
| Broker Markup        | Unlimited  | Broker keeps 100%             |

### Example Transaction ($1,000 tradeline)

- Customer pays: $1,200 (with 20% broker markup)
- TradelineSupply gets: $500
- Broker gets: $100 (share) + $200 (markup) = $300
- Platform keeps: $400

## 🔧 Admin Panel

### Initial Login

```
Email: admin@tradelinerental.com
Password: [set in .env]
```

### Key Functions

- Approve/manage brokers
- Set revenue share percentages
- Process monthly payouts
- View platform analytics
- Generate revenue reports

## 🔌 Broker Integration

### Widget Embed Code

```html
<div id="tradeline-widget"></div>
<script src="https://widget.tradelinerental.com/widget.js"></script>
<script>
  TradelineWidget.init(
    {
      apiKey: "tlm_broker_api_key_here",
    },
    "tradeline-widget"
  );
</script>
```

## 📊 API Documentation

### Public Endpoints (Widget)

- `GET /api/public/pricing` - Get tradeline pricing
- `POST /api/public/calculate` - Calculate cart totals
- `POST /api/public/track` - Track analytics events

### Order Endpoints

- `POST /api/orders/checkout` - Create checkout session
- `POST /api/orders/webhook/stripe` - Stripe webhook handler

### Admin Endpoints

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/dashboard` - Platform statistics
- `POST /api/brokers` - Create broker account

### Broker Portal

- `POST /api/portal/login` - Broker authentication
- `GET /api/portal/dashboard` - Broker statistics
- `PATCH /api/portal/settings` - Update markup

## 🔐 Security

- OAuth 1.0a for TradelineSupply API
- JWT authentication for admin/broker portals
- API key authentication for widgets
- Rate limiting on all endpoints
- Stripe webhook signature verification

## 🚀 Deployment

### Production Checklist

- [ ] Configure SSL certificates
- [ ] Set strong passwords in .env
- [ ] Enable backup cron job
- [ ] Configure monitoring alerts
- [ ] Set up log aggregation
- [ ] Configure CDN for widget

### Backup & Recovery

```bash
# Backup database
./scripts/backup.sh

# Restore from backup
docker-compose exec -T postgres psql -U tradeline < backup.sql
```

## 📈 Monitoring

```bash
# Check system health
./scripts/health-check.sh

# View logs
docker-compose logs -f backend

# Monitor resources
docker stats
```

## 🤝 Support

- Documentation: https://docs.tradelinerental.com
- Issues: https://github.com/your-org/tradeline-marketplace/issues

## 📄 License

Proprietary - All rights reserved
