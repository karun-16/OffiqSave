import ytDlp from 'yt-dlp-exec';
import { PlatformClassifier } from '../classifier/PlatformClassifier';
import { ExtractorRegistry } from '../extractors/ExtractorRegistry';
import { MediaInfo } from '../common/types';
import { ExtractorCache } from '../common/Cache';
import { ExtractorLogger } from '../common/Logger';

export class PlatformRouter {
  /**
   * Main route function: URL -> PlatformClassifier -> ExtractorRegistry -> Native Extractor -> Success? (Return) : yt-dlp fallback
   */
  public static async route(url: string): Promise<MediaInfo> {
    const startTime = performance.now();
    const platform = PlatformClassifier.classify(url);

    // 1. Check cache first
    const cached = ExtractorCache.getMetadata(url);
    if (cached) {
      ExtractorLogger.logExtraction({
        platform,
        parser: 'CacheHit',
        mediaType: cached.mediaType,
        source: 'ExtractorCache',
        nativeSuccess: true,
        fallbackUsed: false,
        executionTimeMs: performance.now() - startTime,
        message: 'Serving metadata from cache'
      });
      return cached;
    }

    // 2. Find native extractor
    console.log('[TRACE YT 2] Resolving extractor');
    const extractor = ExtractorRegistry.findExtractor(url);
    if (extractor) {
      console.log(`[TRACE YT 3] Extractor resolved: ${extractor.platform()}`);
      try {
        const mediaInfo = await extractor.extract(url);
        const execTime = performance.now() - startTime;

        ExtractorLogger.logExtraction({
          platform: mediaInfo.platform || platform,
          parser: extractor.constructor.name,
          mediaType: mediaInfo.mediaType,
          source: mediaInfo.source || 'Native Extractor',
          nativeSuccess: true,
          fallbackUsed: false,
          executionTimeMs: execTime
        });

        ExtractorCache.setMetadata(url, mediaInfo);
        return mediaInfo;
      } catch (err: any) {
        ExtractorLogger.warn(`Native extractor (${extractor.constructor.name}) failed for ${url}: ${err.message}. Triggering yt-dlp fallback...`);
      }
    }

    // 3. Fallback: yt-dlp extraction
    const fallbackStartTime = performance.now();
    try {
      const mediaInfo = await this.extractWithYtDlp(url, platform);
      const totalExecTime = performance.now() - startTime;

      ExtractorLogger.logExtraction({
        platform,
        parser: 'yt-dlp Fallback',
        mediaType: mediaInfo.mediaType,
        source: 'yt-dlp',
        nativeSuccess: false,
        fallbackUsed: true,
        executionTimeMs: totalExecTime,
        message: `yt-dlp fallback succeeded in ${(performance.now() - fallbackStartTime).toFixed(2)}ms`
      });

      ExtractorCache.setMetadata(url, mediaInfo);
      return mediaInfo;
    } catch (fallbackErr: any) {
      ExtractorLogger.error(`yt-dlp fallback also failed for ${url}: ${fallbackErr.message}`);
      throw new Error(`Media extraction failed for ${platform} URL: ${url}. (${fallbackErr.message})`);
    }
  }

  /**
   * Generic yt-dlp fallback parser returning standard MediaInfo
   */
  private static async extractWithYtDlp(url: string, platform: string): Promise<MediaInfo> {
    const rawData: any = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true
    });

    let mediaType: 'IMAGE' | 'VIDEO' | 'GALLERY' | 'AUDIO' = 'VIDEO';
    const images: any[] = [];
    const formats: any[] = [];
    const audio: any[] = [];

    if (rawData._type === 'playlist' || (rawData.entries && Array.isArray(rawData.entries))) {
      mediaType = 'GALLERY';
      for (const entry of rawData.entries) {
        if (entry.url) {
          images.push({
            id: entry.id || `img-${images.length}`,
            url: entry.url,
            downloadUrl: entry.url,
            format: entry.ext || 'jpg'
          });
        }
      }
    } else if (rawData.formats && Array.isArray(rawData.formats)) {
      for (const f of rawData.formats) {
        if (f.vcodec !== 'none' && f.url) {
          formats.push({
            id: f.format_id || `fmt-${formats.length}`,
            url: f.url,
            quality: f.resolution || (f.height ? `${f.height}p` : 'HD'),
            resolution: f.resolution,
            ext: f.ext || 'mp4',
            width: f.width,
            height: f.height,
            filesize: f.filesize,
            bitrate: f.tbr,
            vcodec: f.vcodec,
            acodec: f.acodec,
            format_id: f.format_id,
            format_note: f.format_note
          });
        } else if (f.acodec !== 'none' && f.url) {
          audio.push({
            id: f.format_id || `audio-${audio.length}`,
            url: f.url,
            ext: f.ext || 'mp3',
            bitrate: f.abr || f.tbr
          });
        }
      }
    }

    if (formats.length === 0 && rawData.url) {
      if (rawData.ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawData.ext.toLowerCase())) {
        mediaType = 'IMAGE';
        images.push({
          id: rawData.id || 'img-1',
          url: rawData.url,
          downloadUrl: rawData.url,
          format: rawData.ext
        });
      } else {
        formats.push({
          id: 'best',
          url: rawData.url,
          quality: 'HD',
          ext: rawData.ext || 'mp4',
          format_id: 'best'
        });
      }
    }

    return {
      platform,
      mediaType,
      title: rawData.title || `${platform} Media`,
      description: rawData.description,
      author: rawData.uploader || rawData.channel || '',
      thumbnail: rawData.thumbnail || '',
      duration: rawData.duration || 0,
      width: rawData.width,
      height: rawData.height,
      images: images.length > 0 ? images : undefined,
      formats: formats.length > 0 ? formats : undefined,
      audio: audio.length > 0 ? audio : undefined,
      source: 'yt-dlp Fallback'
    };
  }
}
