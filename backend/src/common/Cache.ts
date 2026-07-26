import NodeCache from 'node-cache';
import { MediaInfo } from './types';

export function normalizeCacheKey(url: string): string {
  if (!url || typeof url !== 'string') return url;
  try {
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');
    if (isYouTube) {
      let videoId: string | null = null;
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('#')[0] || null;
      } else if (url.includes('/shorts/')) {
        videoId = url.split('/shorts/')[1]?.split('?')[0]?.split('#')[0] || null;
      } else if (url.includes('v=')) {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        videoId = u.searchParams.get('v');
      }
      if (videoId) {
        return `youtube:${videoId.trim()}`;
      }
    }
  } catch (e) {
    // Fallback to raw URL
  }
  return url;
}

export class ExtractorCache {
  private static metadataCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
  private static mediaUrlCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

  public static getMetadata(url: string): MediaInfo | undefined {
    const key = normalizeCacheKey(url);
    return this.metadataCache.get<MediaInfo>(key);
  }

  public static setMetadata(url: string, data: MediaInfo, ttlSeconds?: number): void {
    const key = normalizeCacheKey(url);
    if (ttlSeconds) {
      this.metadataCache.set(key, data, ttlSeconds);
    } else {
      this.metadataCache.set(key, data);
    }
  }

  public static getMediaUrl(key: string): string | undefined {
    const normKey = normalizeCacheKey(key);
    return this.mediaUrlCache.get<string>(normKey);
  }

  public static setMediaUrl(key: string, url: string, ttlSeconds?: number): void {
    const normKey = normalizeCacheKey(key);
    if (ttlSeconds) {
      this.mediaUrlCache.set(normKey, url, ttlSeconds);
    } else {
      this.mediaUrlCache.set(normKey, url);
    }
  }

  public static clear(): void {
    this.metadataCache.flushAll();
    this.mediaUrlCache.flushAll();
  }
}
