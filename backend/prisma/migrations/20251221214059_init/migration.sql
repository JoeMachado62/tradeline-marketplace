-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "BrokerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ACH', 'WIRE', 'CHECK', 'PAYPAL', 'CASH', 'MANUAL');

-- CreateEnum
CREATE TYPE "WebhookSource" AS ENUM ('STRIPE', 'TRADELINE_SUPPLY');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'SUPPORT');

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "revenue_share_percent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "markup_type" "MarkupType" NOT NULL DEFAULT 'PERCENTAGE',
    "markup_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BrokerStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "broker_id" TEXT,
    "customer_email" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "stripe_session_id" TEXT,
    "stripe_payment_intent" TEXT,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal_base" INTEGER NOT NULL,
    "broker_revenue_share" INTEGER NOT NULL,
    "broker_markup" INTEGER NOT NULL,
    "platform_net_revenue" INTEGER NOT NULL,
    "total_charged" INTEGER NOT NULL,
    "tradeline_order_id" TEXT,
    "tradeline_order_status" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "credit_limit" INTEGER NOT NULL,
    "date_opened" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "base_price" INTEGER NOT NULL,
    "revenue_share" INTEGER NOT NULL,
    "markup" INTEGER NOT NULL,
    "customer_price" INTEGER NOT NULL,
    "total_base" INTEGER NOT NULL,
    "total_revenue_share" INTEGER NOT NULL,
    "total_markup" INTEGER NOT NULL,
    "total_customer_price" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRecord" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "revenue_share_amount" INTEGER NOT NULL,
    "markup_amount" INTEGER NOT NULL,
    "total_commission" INTEGER NOT NULL,
    "payout_status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payout_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_revenue_share" INTEGER NOT NULL,
    "total_markup" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'ACH',
    "payment_details" JSONB,
    "transaction_id" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "widget_loads" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "cart_additions" INTEGER NOT NULL DEFAULT 0,
    "cart_abandonment" INTEGER NOT NULL DEFAULT 0,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "total_sales" INTEGER NOT NULL DEFAULT 0,
    "revenue_share_earned" INTEGER NOT NULL DEFAULT 0,
    "markup_earned" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION,
    "average_order_value" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "source" "WebhookSource" NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "status" "WebhookStatus" NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Broker_email_key" ON "Broker"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Broker_api_key_key" ON "Broker"("api_key");

-- CreateIndex
CREATE INDEX "Broker_email_idx" ON "Broker"("email");

-- CreateIndex
CREATE INDEX "Broker_api_key_idx" ON "Broker"("api_key");

-- CreateIndex
CREATE INDEX "Broker_status_idx" ON "Broker"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- CreateIndex
CREATE INDEX "Order_broker_id_idx" ON "Order"("broker_id");

-- CreateIndex
CREATE INDEX "Order_customer_email_idx" ON "Order"("customer_email");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_created_at_idx" ON "Order"("created_at");

-- CreateIndex
CREATE INDEX "Order_order_number_idx" ON "Order"("order_number");

-- CreateIndex
CREATE INDEX "OrderItem_order_id_idx" ON "OrderItem"("order_id");

-- CreateIndex
CREATE INDEX "CommissionRecord_broker_id_idx" ON "CommissionRecord"("broker_id");

-- CreateIndex
CREATE INDEX "CommissionRecord_payout_status_idx" ON "CommissionRecord"("payout_status");

-- CreateIndex
CREATE INDEX "CommissionRecord_created_at_idx" ON "CommissionRecord"("created_at");

-- CreateIndex
CREATE INDEX "Payout_broker_id_idx" ON "Payout"("broker_id");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_period_start_period_end_idx" ON "Payout"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "Analytics_broker_id_idx" ON "Analytics"("broker_id");

-- CreateIndex
CREATE INDEX "Analytics_date_idx" ON "Analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_broker_id_date_key" ON "Analytics"("broker_id", "date");

-- CreateIndex
CREATE INDEX "WebhookLog_order_id_idx" ON "WebhookLog"("order_id");

-- CreateIndex
CREATE INDEX "WebhookLog_source_idx" ON "WebhookLog"("source");

-- CreateIndex
CREATE INDEX "WebhookLog_created_at_idx" ON "WebhookLog"("created_at");

-- CreateIndex
CREATE INDEX "ActivityLog_broker_id_idx" ON "ActivityLog"("broker_id");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_created_at_idx" ON "ActivityLog"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCache_cache_key_key" ON "PricingCache"("cache_key");

-- CreateIndex
CREATE INDEX "PricingCache_cache_key_idx" ON "PricingCache"("cache_key");

-- CreateIndex
CREATE INDEX "PricingCache_expires_at_idx" ON "PricingCache"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_email_idx" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "Broker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
