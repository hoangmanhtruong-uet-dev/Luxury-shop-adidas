import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/config/env';
import { canonicalExtensionForMime, detectAllowedImageMime } from '@/lib/upload/upload-policy';

export interface StorageAdapter {
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

/** Phase 3.4 (Warning W10): bound every Cloudinary call. */
const CLOUDINARY_TIMEOUT_MS = 15_000;

class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.UPLOAD_DIR);
  }

  private resolveKey(key: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|gif|webp)$/i.test(key)) {
      throw new Error('Invalid storage key');
    }
    const filePath = path.resolve(this.uploadDir, key);
    const relative = path.relative(this.uploadDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Invalid storage path');
    }
    return filePath;
  }

  async upload(file: Buffer, _filename: string, mimeType: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const detectedMime = detectAllowedImageMime(file);
    if (!detectedMime || detectedMime !== mimeType) throw new Error('Invalid image content');
    const key = `${crypto.randomUUID()}${canonicalExtensionForMime(detectedMime)}`;
    const filePath = this.resolveKey(key);
    await fs.writeFile(filePath, file);
    return key;
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.resolveKey(key);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

class S3StorageAdapter implements StorageAdapter {
  async upload(_file: Buffer, _filename: string, _mimeType: string): Promise<string> {
    // ponytail: Implement S3 upload when needed
    throw new Error('S3 Storage not implemented yet');
  }
  async delete(_key: string): Promise<void> {
    throw new Error('S3 Storage not implemented yet');
  }
  getUrl(_key: string): string {
    throw new Error('S3 Storage not implemented yet');
  }
}

class CloudinaryStorageAdapter implements StorageAdapter {
  constructor() {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
    }
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  /**
   * Phase 3.4 (Warning W10): the Cloudinary SDK accepts no timeout option on
   * `destroy()`, and `upload_stream` is callback-based, so both calls are bounded
   * explicitly. Without a bound a stalled request held the upload handler open
   * until the platform timeout, and the catch block then ran while the object may
   * already exist at Cloudinary — leaking quota and CDN cost.
   */
  private static withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}-timeout`)), CLOUDINARY_TIMEOUT_MS);
    });
    return Promise.race([work, timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async upload(file: Buffer, _filename: string, _mimeType: string): Promise<string> {
    const upload = new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: env.CLOUDINARY_FOLDER,
        resource_type: 'image',
        unique_filename: true,
        overwrite: false,
      }, (error, result) => {
        if (error || !result?.public_id) {
          reject(error ?? new Error('Cloudinary upload returned no public id'));
          return;
        }
        resolve(result.public_id);
      });
      stream.end(file);
    });
    return CloudinaryStorageAdapter.withTimeout(upload, 'cloudinary-upload');
  }

  async delete(key: string): Promise<void> {
    await CloudinaryStorageAdapter.withTimeout(
      cloudinary.uploader.destroy(key, { resource_type: 'image', invalidate: true }),
      'cloudinary-delete',
    );
  }

  getUrl(key: string): string {
    return cloudinary.url(key, { secure: true, fetch_format: 'auto', quality: 'auto' });
  }
}

function createStorageAdapter(): StorageAdapter {
  if (env.STORAGE_PROVIDER === 'cloudinary') return new CloudinaryStorageAdapter();
  if (env.STORAGE_PROVIDER === 's3') return new S3StorageAdapter();
  return new LocalStorageAdapter();
}
export class StorageService {
  private static adapter: StorageAdapter = createStorageAdapter();

  static async upload(file: Buffer, filename: string, mimeType: string): Promise<string> {
    return this.adapter.upload(file, filename, mimeType);
  }

  static async delete(key: string): Promise<void> {
    return this.adapter.delete(key);
  }

  static getUrl(key: string): string {
    return this.adapter.getUrl(key);
  }

  static async validateFile(file: Buffer, mimeType: string): Promise<boolean> {
    // Defense-in-depth re-check using the same strict magic-byte detector
    // (header + footer markers) used in upload-policy validateUploadBuffer.
    // This ensures the storage layer independently verifies file content
    // even if called from a path that bypassed the handler validation.
    return detectAllowedImageMime(file) === mimeType;
  }
}