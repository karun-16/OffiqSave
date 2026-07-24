import NodeCache from 'node-cache';
import { MediaInfo } from './types';

export class ExtractorCache {
  private static metadataCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
  private static mediaUrlCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

  public static getMetadata(url: string): MediaInfo | undefined {
    return this.metadataCache.get<MediaInfo>(url);
  }

  public static setMetadata(url: string, data: MediaInfo, ttlSeconds?: number): void {
    if (ttlSeconds) {
      this.metadataCache.set(url, data, ttlSeconds);
    } else {
      this.metadataCache.set(url, data);
    }
  }

  public static getMediaUrl(key: string): string | undefined {
    return this.mediaUrlCache.get<string>(key);
  }

  public static setMediaUrl(key: string, url: string, ttlSeconds?: number): void {
    if (ttlSeconds) {
      this.mediaUrlCache.set(key, url, ttlSeconds);
    } else {
      this.mediaUrlCache.set(key, url);
    }
  }

  public static clear(): void {
    this.metadataCache.flushAll();
    this.mediaUrlCache.flushAll();
  }
}
