import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export function getYouTubeCookiePath(): string | null {
  const prodCookiePath = '/etc/secrets/youtube-cookies.txt';
  if (fs.existsSync(prodCookiePath)) {
    return prodCookiePath;
  }
  const devCookiePath = path.join(process.cwd(), 'youtube-cookies.txt');
  if (fs.existsSync(devCookiePath)) {
    return devCookiePath;
  }
  return null;
}

export interface WritableCookieCopy {
  sourcePath: string;
  tempPath: string;
}

export function prepareWritableCookieCopy(): WritableCookieCopy | null {
  const sourcePath = getYouTubeCookiePath();
  if (!sourcePath) return null;

  try {
    const tempDir = os.tmpdir();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempPath = path.join(tempDir, `offiqsave_yt_cookies_${uuidv4()}.txt`);
    fs.copyFileSync(sourcePath, tempPath);
    return { sourcePath, tempPath };
  } catch (err: any) {
    console.error('[YouTube Diagnostic] Failed to create writable cookie copy:', err?.message || err);
    return null;
  }
}

export function cleanupWritableCookieCopy(cookieCopy: WritableCookieCopy | null): void {
  if (!cookieCopy?.tempPath) return;
  try {
    if (fs.existsSync(cookieCopy.tempPath)) {
      fs.unlinkSync(cookieCopy.tempPath);
    }
  } catch (err: any) {
    console.warn('[YouTube Diagnostic] Warning: Failed to clean up temp cookie file:', err?.message || err);
  }
}
