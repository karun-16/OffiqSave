import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { TikTokUtils } from './Utils';
import { TikTokParser } from './Parser';

export class TikTokExtractor implements MediaExtractor {
  public platform(): string {
    return 'TikTok';
  }

  public supports(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('tiktok.com') || lower.includes('vt.tiktok.com');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const cleaned = TikTokUtils.cleanUrl(url);

    try {
      const html = await HtmlFetcher.fetch(cleaned);
      const parsed = TikTokParser.parseHtml(html);

      if (!parsed) {
        throw new ExtractorError('TikTok native extraction failed to parse JSON.', 'NOT_FOUND', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'TikTok Video',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        duration: parsed.duration || 0,
        source: 'Native TikTok Extractor'
      };

      if (parsed.videoUrl) {
        mediaInfo.formats = [{
          id: 'tt-vid',
          url: parsed.videoUrl,
          ext: 'mp4',
          quality: 'HD',
          vcodec: 'h264',
          acodec: 'aac',
          format_id: 'mp4',
          format_note: 'TikTok MP4'
        }];
      } else if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: `tt-img-${idx}`,
          url: img,
          downloadUrl: img,
          format: 'jpg',
          filename: `tiktok_${idx + 1}.jpg`
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'TikTok native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
