/**
 * Upload a file to S3
 * @param file - Buffer or file content
 * @param key - S3 object key (path/filename)
 * @param contentType - MIME type
 * @returns S3 URL
 */
export declare function uploadToS3(file: Buffer, key: string, contentType: string): Promise<{
    url: string;
    key: string;
}>;
/**
 * Get a signed URL for private file access (expires in 1 hour)
 * @param key - S3 object key
 * @returns Signed URL
 */
export declare function getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Delete a file from S3
 * @param key - S3 object key
 */
export declare function deleteFromS3(key: string): Promise<void>;
/**
 * Generate a unique key for document uploads
 * @param type - Document type (id_document, ssn_document, etc.)
 * @param clientId - Client ID
 * @param originalFilename - Original filename
 * @returns S3 key
 */
export declare function generateDocumentKey(type: string, clientId: string, originalFilename: string): string;
/**
 * Check if S3 is configured
 */
export declare function isS3Configured(): boolean;
export declare const S3Service: {
    upload: typeof uploadToS3;
    getSignedUrl: typeof getSignedDownloadUrl;
    delete: typeof deleteFromS3;
    generateKey: typeof generateDocumentKey;
    isConfigured: typeof isS3Configured;
};
//# sourceMappingURL=S3Service.d.ts.map