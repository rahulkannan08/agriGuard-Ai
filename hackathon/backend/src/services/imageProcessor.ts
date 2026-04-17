import sharp from 'sharp';
import { config } from '../config';

export class ImageProcessor {
  private blurThreshold: number;

  constructor(blurThreshold?: number) {
    this.blurThreshold = blurThreshold ?? config.blurThreshold;
  }

  async validate(base64Image: string) {
    const buffer = this.decodeBase64(base64Image);

    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    // Calculate blur score using pixel variance (Laplacian approximation)
    const blurScore = await this.calculateBlurScore(buffer);

    return {
      blurScore,
      isBlurry: blurScore < this.blurThreshold,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  }

  decodeBase64(base64Image: string): Buffer {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  private async calculateBlurScore(buffer: Buffer): Promise<number> {
    const { data, info } = await sharp(buffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data);
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < pixels.length; i++) {
      sum += pixels[i];
      sumSq += pixels[i] * pixels[i];
    }

    const mean = sum / pixels.length;
    const variance = (sumSq / pixels.length) - (mean * mean);
    return variance;
  }

  async preprocess(base64Image: string): Promise<Buffer> {
    const buffer = this.decodeBase64(base64Image);

    return await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .toFormat('png')
      .toBuffer();
  }

  async preprocessToTensor(base64Image: string): Promise<Float32Array> {
    const buffer = this.decodeBase64(base64Image);

    const { data } = await sharp(buffer)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert to float32 array normalized to [0, 1]
    // Input shape expected: [1, 224, 224, 3] (NHWC format)
    const pixels = new Float32Array(224 * 224 * 3);
    for (let i = 0; i < data.length; i++) {
      pixels[i] = data[i] / 255.0;
    }

    return pixels;
  }
}
