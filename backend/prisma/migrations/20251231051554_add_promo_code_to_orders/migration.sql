-- CreateTable
CREATE TABLE `Broker` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `business_name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `business_address` VARCHAR(191) NULL,
    `api_key` VARCHAR(191) NOT NULL,
    `api_secret` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `revenue_share_percent` DOUBLE NOT NULL DEFAULT 10,
    `markup_type` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `markup_value` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `approved_by` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Broker_email_key`(`email`),
    UNIQUE INDEX `Broker_api_key_key`(`api_key`),
    INDEX `Broker_email_idx`(`email`),
    INDEX `Broker_api_key_idx`(`api_key`),
    INDEX `Broker_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `address` VARCHAR(191) NULL,
    `excluded_banks` TEXT NOT NULL DEFAULT '[]',
    `id_document_path` VARCHAR(191) NULL,
    `ssn_document_path` VARCHAR(191) NULL,
    `documents_verified` BOOLEAN NOT NULL DEFAULT false,
    `signature` TEXT NULL,
    `signed_agreement_date` DATETIME(3) NULL,
    `reset_token` VARCHAR(191) NULL,
    `reset_token_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditReport` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `parsed_data` LONGTEXT NULL,
    `creditors_found` TEXT NOT NULL DEFAULT '[]',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `order_number` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NULL,
    `broker_id` VARCHAR(191) NULL,
    `customer_email` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `customer_phone` VARCHAR(191) NULL,
    `stripe_session_id` VARCHAR(191) NULL,
    `stripe_payment_intent` VARCHAR(191) NULL,
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    `subtotal_base` INTEGER NOT NULL,
    `broker_revenue_share` INTEGER NOT NULL,
    `broker_markup` INTEGER NOT NULL,
    `platform_net_revenue` INTEGER NOT NULL,
    `multi_line_discount` INTEGER NOT NULL DEFAULT 0,
    `promo_code` VARCHAR(191) NULL,
    `total_charged` INTEGER NOT NULL,
    `tradeline_order_id` VARCHAR(191) NULL,
    `tradeline_order_status` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `Order_order_number_key`(`order_number`),
    INDEX `Order_broker_id_idx`(`broker_id`),
    INDEX `Order_client_id_idx`(`client_id`),
    INDEX `Order_customer_email_idx`(`customer_email`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_created_at_idx`(`created_at`),
    INDEX `Order_order_number_idx`(`order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `card_id` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `credit_limit` INTEGER NOT NULL,
    `date_opened` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `base_price` INTEGER NOT NULL,
    `revenue_share` INTEGER NOT NULL,
    `markup` INTEGER NOT NULL,
    `customer_price` INTEGER NOT NULL,
    `total_base` INTEGER NOT NULL,
    `total_revenue_share` INTEGER NOT NULL,
    `total_markup` INTEGER NOT NULL,
    `total_customer_price` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderItem_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommissionRecord` (
    `id` VARCHAR(191) NOT NULL,
    `broker_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `revenue_share_amount` INTEGER NOT NULL,
    `markup_amount` INTEGER NOT NULL,
    `total_commission` INTEGER NOT NULL,
    `payout_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `payout_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,

    INDEX `CommissionRecord_broker_id_idx`(`broker_id`),
    INDEX `CommissionRecord_payout_status_idx`(`payout_status`),
    INDEX `CommissionRecord_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payout` (
    `id` VARCHAR(191) NOT NULL,
    `broker_id` VARCHAR(191) NOT NULL,
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `total_revenue_share` INTEGER NOT NULL,
    `total_markup` INTEGER NOT NULL,
    `total_amount` INTEGER NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL DEFAULT 'ACH',
    `payment_details` TEXT NULL,
    `transaction_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `processed_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Payout_broker_id_idx`(`broker_id`),
    INDEX `Payout_status_idx`(`status`),
    INDEX `Payout_period_start_period_end_idx`(`period_start`, `period_end`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Analytics` (
    `id` VARCHAR(191) NOT NULL,
    `broker_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `widget_loads` INTEGER NOT NULL DEFAULT 0,
    `unique_visitors` INTEGER NOT NULL DEFAULT 0,
    `cart_additions` INTEGER NOT NULL DEFAULT 0,
    `checkout_starts` INTEGER NOT NULL DEFAULT 0,
    `cart_abandonment` INTEGER NOT NULL DEFAULT 0,
    `orders_count` INTEGER NOT NULL DEFAULT 0,
    `total_sales` INTEGER NOT NULL DEFAULT 0,
    `revenue_share_earned` INTEGER NOT NULL DEFAULT 0,
    `markup_earned` INTEGER NOT NULL DEFAULT 0,
    `conversion_rate` DOUBLE NULL,
    `average_order_value` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Analytics_broker_id_idx`(`broker_id`),
    INDEX `Analytics_date_idx`(`date`),
    UNIQUE INDEX `Analytics_broker_id_date_key`(`broker_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookLog` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `payload` TEXT NOT NULL,
    `response` TEXT NULL,
    `status` VARCHAR(191) NOT NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    INDEX `WebhookLog_order_id_idx`(`order_id`),
    INDEX `WebhookLog_source_idx`(`source`),
    INDEX `WebhookLog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `broker_id` VARCHAR(191) NULL,
    `admin_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_broker_id_idx`(`broker_id`),
    INDEX `ActivityLog_action_idx`(`action`),
    INDEX `ActivityLog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingCache` (
    `id` VARCHAR(191) NOT NULL,
    `cache_key` VARCHAR(191) NOT NULL,
    `data` LONGTEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PricingCache_cache_key_key`(`cache_key`),
    INDEX `PricingCache_cache_key_idx`(`cache_key`),
    INDEX `PricingCache_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'STAFF',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admin_email_key`(`email`),
    INDEX `Admin_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CreditReport` ADD CONSTRAINT `CreditReport_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `Broker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionRecord` ADD CONSTRAINT `CommissionRecord_payout_id_fkey` FOREIGN KEY (`payout_id`) REFERENCES `Payout`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionRecord` ADD CONSTRAINT `CommissionRecord_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommissionRecord` ADD CONSTRAINT `CommissionRecord_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `Broker`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payout` ADD CONSTRAINT `Payout_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `Broker`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Analytics` ADD CONSTRAINT `Analytics_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `Broker`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookLog` ADD CONSTRAINT `WebhookLog_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_broker_id_fkey` FOREIGN KEY (`broker_id`) REFERENCES `Broker`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
