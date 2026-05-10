import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import ImageTracer from 'imagetracerjs';
import { uploadToR2 } from '@/lib/r2-storage';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const leadId = formData.get('leadId') as string;
    const type = formData.get('type') as string || 'media'; // 'logo' or 'media'

    if (!file || !leadId) {
      return NextResponse.json({ error: 'Missing file or leadId' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];

    // Fetch lead to get name for path
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { brandDna: true }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const sanitizedName = lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const folderPath = `editor-assets/${sanitizedName}-${leadId.slice(0, 8)}`;
    const results: { webpUrl: string; svgUrl?: string } = { webpUrl: '' };

    if (type === 'logo') {
      // 1. WebP
      const webpBuffer = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      const webpKey = `${folderPath}/logo-${dateStr}-${timestamp}.webp`;
      results.webpUrl = await uploadToR2(webpKey, webpBuffer, 'image/webp');

      // 2. SVG Tracing
      try {
        const { data, info } = await sharp(buffer)
          .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
          .grayscale()
          .threshold(128)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        
        const imgd = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
        const svgString = ImageTracer.imagedataToSVG(imgd, {
          ltres: 1, qtres: 1, pathomit: 8, colorsampling: 0, numberofcolors: 2,
          pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 0 }],
          scale: 1, viewbox: true
        });
        const svgKey = `${folderPath}/logo-${dateStr}-${timestamp}.svg`;
        results.svgUrl = await uploadToR2(svgKey, Buffer.from(svgString), 'image/svg+xml');
      } catch (e) { console.error('SVG Trace failed', e); }

      // Update Database
      await prisma.brandDnaSubmission.upsert({
        where: { leadId },
        update: { 
          logoPath: results.webpUrl,
          logoSvgPath: results.svgUrl || null
        },
        create: {
          leadId,
          logoPath: results.webpUrl,
          logoSvgPath: results.svgUrl || null,
          status: 'SUBMITTED'
        }
      });
    } else {
      // General Media
      const webpBuffer = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const webpKey = `${folderPath}/media-${dateStr}-${timestamp}.webp`;
      results.webpUrl = await uploadToR2(webpKey, webpBuffer, 'image/webp');

      // Update Database - Add to mediaFiles array
      const existingDna = lead.brandDna;
      const currentMedia = Array.isArray(existingDna?.mediaFiles) ? existingDna.mediaFiles : [];
      const updatedMedia = [...currentMedia, results.webpUrl];

      await prisma.brandDnaSubmission.upsert({
        where: { leadId },
        update: { mediaFiles: updatedMedia },
        create: {
          leadId,
          mediaFiles: updatedMedia,
          status: 'SUBMITTED'
        }
      });
    }

    return NextResponse.json({ success: true, ...results });

  } catch (error: any) {
    console.error('Editor Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
