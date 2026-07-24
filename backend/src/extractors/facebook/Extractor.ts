import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { FacebookUtils } from './Utils';
import { FacebookParser } from './Parser';

export class FacebookExtractor implements MediaExtractor {
  public platform(): string {
    return 'Facebook';
  }

  public supports(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com') || lower.includes('fb.gg');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const normalizedUrl = FacebookUtils.normalizeUrl(url);

    try {
      const html = await HtmlFetcher.fetch(normalizedUrl, {
        headers: {
          'Sec-Fetch-Site': 'none'
        }
      });

      const parsed = FacebookParser.parseHtml(html);
      if (!parsed) {
        throw new ExtractorError('Facebook native extraction could not find media. Post might be private.', 'PRIVATE_POST', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'Facebook Media',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        source: 'Native Facebook Extractor'
      };

      if (parsed.mediaType === 'VIDEO') {
        const formats: any[] = [];
        if (parsed.hdUrl) {
          formats.push({
            id: 'fb-hd',
            url: parsed.hdUrl,
            ext: 'mp4',
            quality: 'HD 1080p',
            vcodec: 'h264',
            acodec: 'aac',
            format_id: 'hd',
            format_note: 'HD Video'
          });
        }
        if (parsed.sdUrl) {
          formats.push({
            id: 'fb-sd',
            url: parsed.sdUrl,
            ext: 'mp4',
            quality: 'SD 480p',
            vcodec: 'h264',
            acodec: 'aac',
            format_id: 'sd',
            format_note: 'SD Video'
          });
        }
        mediaInfo.formats = formats;
      } else if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: `fb-img-${idx}`,
          url: img,
          downloadUrl: img,
          format: 'jpg',
          filename: `facebook_${idx + 1}.jpg`
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Facebook native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
