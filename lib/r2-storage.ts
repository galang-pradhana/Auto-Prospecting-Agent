import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a buffer to Cloudflare R2 bucket.
 * @param key The path/filename in the bucket (e.g., "token/logo.webp")
 * @param buffer The file content
 * @param contentType The MIME type (e.g., "image/webp")
 * @returns The public URL of the uploaded asset
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2 configuration missing (R2_BUCKET_NAME or R2_PUBLIC_URL)');
  }

  await R2.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 year cache
  }));

  // Return public URL (ensure no double slashes if publicUrl ends with /)
  const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
  return `${baseUrl}/${key}`;
}
