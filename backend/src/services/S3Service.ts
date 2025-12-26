import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Configuration
const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "tradeline-documents";

// Create S3 client
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn("⚠️ AWS S3 credentials not configured. File uploads will fail.");
    }
    s3Client = new S3Client(s3Config);
  }
  return s3Client;
}

/**
 * Upload a file to S3
 * @param file - Buffer or file content
 * @param key - S3 object key (path/filename)
 * @param contentType - MIME type
 * @returns S3 URL
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await client.send(command);

  // Return the S3 URL
  const url = `https://${BUCKET_NAME}.s3.${s3Config.region}.amazonaws.com/${key}`;

  return { url, key };
}

/**
 * Get a signed URL for private file access (expires in 1 hour)
 * @param key - S3 object key
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  return signedUrl;
}

/**
 * Delete a file from S3
 * @param key - S3 object key
 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

/**
 * Generate a unique key for document uploads
 * @param type - Document type (id_document, ssn_document, etc.)
 * @param clientId - Client ID
 * @param originalFilename - Original filename
 * @returns S3 key
 */
export function generateDocumentKey(
  type: string,
  clientId: string,
  originalFilename: string
): string {
  const ext = originalFilename.split(".").pop() || "pdf";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  
  return `documents/${clientId}/${type}-${timestamp}-${randomSuffix}.${ext}`;
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);
}

export const S3Service = {
  upload: uploadToS3,
  getSignedUrl: getSignedDownloadUrl,
  delete: deleteFromS3,
  generateKey: generateDocumentKey,
  isConfigured: isS3Configured,
};
