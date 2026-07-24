import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { LinkedInUtils } from './Utils';
import { LinkedInParser } from './Parser';

export class LinkedInExtractor implements MediaExtractor {
  public platform(): string {
    return 'LinkedIn';
  }

  public supports(url: string): boolean {
    return url.toLowerCase().includes('linkedin.com');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const cleaned = LinkedInUtils.cleanUrl(url);

    try {
      const html = await HtmlFetcher.fetch(cleaned);
      const parsed = LinkedInParser.parseHtml(html);

      if (!parsed) {
        throw new ExtractorError('LinkedIn media failed to parse natively.', 'NOT_FOUND', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'LinkedIn Post',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        source: 'Native LinkedIn Extractor'
      };

      if (parsed.videoUrl) {
        mediaInfo.formats = [{
          id: 'li-vid',
          url: parsed.videoUrl,
          ext: 'mp4',
          quality: 'HD',
          vcodec: 'h264',
          acodec: 'aac',
          format_id: 'mp4',
          format_note: 'LinkedIn Video'
        }];
      } else if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: `li-img-${idx}`,
          url: img,
          downloadUrl: img,
          format: 'jpg',
          filename: `linkedin_${idx + 1}.jpg`
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'LinkedIn native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
