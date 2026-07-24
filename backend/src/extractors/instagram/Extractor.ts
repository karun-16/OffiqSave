import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { InstagramUtils } from './Utils';
import { InstagramParser } from './Parser';

export class InstagramExtractor implements MediaExtractor {
  public platform(): string {
    return 'Instagram';
  }

  public supports(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('instagram.com') || lower.includes('instagr.am');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const { canonicalUrl } = InstagramUtils.normalizeUrl(url);

    try {
      const html = await HtmlFetcher.fetch(canonicalUrl, {
        headers: {
          'Sec-Fetch-Site': 'none'
        }
      });

      const parsed = InstagramParser.parseHtml(html);
      if (!parsed) {
        throw new ExtractorError('Unable to parse Instagram media from HTML. Might be private post.', 'PRIVATE_POST', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'Instagram Post',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        source: 'Native Instagram Extractor'
      };

      if (parsed.images) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: img.id || `ig-img-${idx}`,
          url: img.url,
          downloadUrl: img.url,
          format: 'jpg',
          filename: `instagram_${idx + 1}.jpg`
        }));
      }

      if (parsed.videos) {
        mediaInfo.formats = parsed.videos.map((vid, idx) => ({
          id: vid.id || `ig-vid-${idx}`,
          url: vid.video_url || vid.url,
          ext: 'mp4',
          quality: 'HD',
          vcodec: 'h264',
          acodec: 'aac',
          format_id: 'mp4_hd',
          format_note: 'MP4'
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Instagram native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
