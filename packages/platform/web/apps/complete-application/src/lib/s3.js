import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  },
  region: process.env.MINIO_REGION || 'us-east-1',
  forcePathStyle: true, // required for MinIO
});

// Helper function to upload file
export async function uploadToS3(bucket, key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read',
  });
  
  return await s3Client.send(command);
}
