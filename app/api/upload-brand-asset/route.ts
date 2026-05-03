import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import ImageTracer from 'imagetracerjs';
import { uploadToR2 } from '@/lib/r2-storage';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const token = formData.get('token') as string || 'anonymous';
    const type = formData.get('type') as string || 'media'; // 'logo', 'content', 'ref'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch business name for better folder organization
    const submission = await prisma.brandDnaSubmission.findUnique({
      where: { token },
      include: { lead: true }
    });

    const businessName = submission?.lead.name || 'Unknown';
    const sanitizedBusinessName = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Folder structure: brand-assets/[business-name]-[token-prefix]/
    const folderPath = `brand-assets/${sanitizedBusinessName}-${token.slice(0, 8)}`;
    const results: { webpUrl: string; svgUrl?: string } = { webpUrl: '' };

    if (type === 'logo') {
      // 1. Convert to WebP for standard web usage
      const webpBuffer = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      
      const webpKey = `${folderPath}/logo-${sanitizedBusinessName}-${dateStr}-${timestamp}.webp`;
      results.webpUrl = await uploadToR2(webpKey, webpBuffer, 'image/webp');

      // 2. Convert to SVG via ImageTracerJS (Next.js friendly alternative to potrace)
      try {
        // Process with sharp to get clean black/white high-res data for tracing
        const { data, info } = await sharp(buffer)
          .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
          .grayscale()
          .threshold(128)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        
        const imgd = {
          width: info.width,
          height: info.height,
          data: new Uint8ClampedArray(data)
        };
        
        // Trace with options optimized for silhouettes
        const svgString = ImageTracer.imagedataToSVG(imgd, {
          ltres: 1,
          qtres: 1,
          pathomit: 8,
          colorsampling: 0,
          numberofcolors: 2,
          pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 0 }],
          scale: 1,
          viewbox: true
        });
        
        const svgKey = `${folderPath}/logo-${sanitizedBusinessName}-${dateStr}-${timestamp}.svg`;
        results.svgUrl = await uploadToR2(svgKey, Buffer.from(svgString), 'image/svg+xml');
      } catch (svgErr) {
        console.error('SVG Tracing failed:', svgErr);
      }
    } else {
      // Content or Reference images - WebP only
      const webpBuffer = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      
      const filename = `${type}-${sanitizedBusinessName}-${dateStr}-${timestamp}.webp`;
      const webpKey = `${folderPath}/${filename}`;
      results.webpUrl = await uploadToR2(webpKey, webpBuffer, 'image/webp');
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
