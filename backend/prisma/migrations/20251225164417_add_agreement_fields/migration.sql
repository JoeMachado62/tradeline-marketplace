/*
  Warnings:

  - You are about to drop the column `website` on the `Broker` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Broker" DROP COLUMN "website",
ADD COLUMN     "business_address" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signed_agreement_date" TIMESTAMP(3);
