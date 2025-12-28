"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
exports.uploadToS3 = uploadToS3;
exports.getSignedDownloadUrl = getSignedDownloadUrl;
exports.deleteFromS3 = deleteFromS3;
exports.generateDocumentKey = generateDocumentKey;
exports.isS3Configured = isS3Configured;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
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
let s3Client = null;
function getS3Client() {
    if (!s3Client) {
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.warn("⚠️ AWS S3 credentials not configured. File uploads will fail.");
        }
        s3Client = new client_s3_1.S3Client(s3Config);
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
async function uploadToS3(file, key, contentType) {
    const client = getS3Client();
    const command = new client_s3_1.PutObjectCommand({
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
async function getSignedDownloadUrl(key, expiresIn = 3600) {
    const client = getS3Client();
    const command = new client_s3_1.GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn });
    return signedUrl;
}
/**
 * Delete a file from S3
 * @param key - S3 object key
 */
async function deleteFromS3(key) {
    const client = getS3Client();
    const command = new client_s3_1.DeleteObjectCommand({
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
function generateDocumentKey(type, clientId, originalFilename) {
    const ext = originalFilename.split(".").pop() || "pdf";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    return `documents/${clientId}/${type}-${timestamp}-${randomSuffix}.${ext}`;
}
/**
 * Check if S3 is configured
 */
function isS3Configured() {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);
}
exports.S3Service = {
    upload: uploadToS3,
    getSignedUrl: getSignedDownloadUrl,
    delete: deleteFromS3,
    generateKey: generateDocumentKey,
    isConfigured: isS3Configured,
};
//# sourceMappingURL=S3Service.js.map