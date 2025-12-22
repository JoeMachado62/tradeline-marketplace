-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'STRIPE';

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "admin_id" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'MANUAL';
