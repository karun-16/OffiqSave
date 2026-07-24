import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { PinterestParser } from './Parser';

export class PinterestExtractor implements MediaExtractor {
  public platform(): string {
    return 'Pinterest';
  }

  public supports(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('pinterest.com') || lower.includes('pin.it');
  }

  public async extract(url: string): Promise<MediaInfo> {
    try {
      const html = await HtmlFetcher.fetch(url);
      const parsed = PinterestParser.parseHtml(html);

      if (!parsed) {
        throw new ExtractorError('Pinterest pin media could not be parsed.', 'NOT_FOUND', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'Pinterest Pin',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        source: 'Native Pinterest Extractor'
      };

      if (parsed.videoUrl) {
        mediaInfo.formats = [{
          id: 'pin-vid',
          url: parsed.videoUrl,
          ext: 'mp4',
          quality: 'HD',
          vcodec: 'h264',
          acodec: 'aac',
          format_id: 'mp4',
          format_note: 'Pinterest MP4'
        }];
      } else if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: `pin-img-${idx}`,
          url: img,
          downloadUrl: img,
          format: 'jpg',
          filename: `pinterest_${idx + 1}.jpg`
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Pinterest native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
