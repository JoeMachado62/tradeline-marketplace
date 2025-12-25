-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "address" TEXT,
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "documents_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "id_document_path" TEXT,
ADD COLUMN     "ssn_document_path" TEXT;
