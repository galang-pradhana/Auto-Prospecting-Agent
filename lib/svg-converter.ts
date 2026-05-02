import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'fs';

/**
 * Converts an image file (jpg, png, webp) to a black and white SVG.
 * Process:
 * 1. Normalize with sharp (resize, grayscale, normalize, threshold)
 * 2. Trace with potrace to get vector paths
 */
export async function convertImageToSvg(
  inputPath: string, 
  outputPath: string
): Promise<void> {
  try {
    // 1. Process with sharp to get a clean black and white PNG buffer for tracing
    const processedBuffer = await sharp(inputPath)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .threshold(128) // Force to black and white for better tracing
      .png()
      .toBuffer();

    // 2. Trace with potrace
    return new Promise((resolve, reject) => {
      potrace.trace(processedBuffer, {
        threshold: 128,
        color: '#000000',
        background: 'transparent',
      }, (err, svg) => {
        if (err) {
          console.error("Potrace error:", err);
          reject(err);
        } else {
          try {
            fs.writeFileSync(outputPath, svg);
            resolve();
          } catch (writeErr) {
            console.error("FS Write error:", writeErr);
            reject(writeErr);
          }
        }
      });
    });
  } catch (error) {
    console.error("SVG Conversion Pipeline error:", error);
    throw error;
  }
}
