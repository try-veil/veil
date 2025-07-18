// pages/api/upload.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '../../../lib/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const bucket = 'images';
    const key = `${Date.now()}-${file.name}`;

    await uploadToS3(bucket, key, buffer, file.type);

    const imageUrl = `http://localhost:9000/${bucket}/${key}`;
    
    return NextResponse.json({ 
      message: 'Uploaded', 
      url: imageUrl 
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
