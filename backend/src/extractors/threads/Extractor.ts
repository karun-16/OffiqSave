import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { ThreadsUtils } from './Utils';
import { ThreadsParser } from './Parser';

export class ThreadsExtractor implements MediaExtractor {
  public platform(): string {
    return 'Threads';
  }

  public supports(url: string): boolean {
    return url.toLowerCase().includes('threads.net');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const cleaned = ThreadsUtils.normalizeUrl(url);

    try {
      const html = await HtmlFetcher.fetch(cleaned);
      const parsed = ThreadsParser.parseHtml(html);

      if (!parsed) {
        throw new ExtractorError('Threads media parsing failed natively.', 'NOT_FOUND', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'Threads Post',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        source: 'Native Threads Extractor'
      };

      if (parsed.videoUrl) {
        mediaInfo.formats = [{
          id: 'th-vid',
          url: parsed.videoUrl,
          ext: 'mp4',
          quality: 'HD',
          vcodec: 'h264',
          acodec: 'aac',
          format_id: 'mp4',
          format_note: 'Threads Video'
        }];
      } else if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: `th-img-${idx}`,
          url: img,
          downloadUrl: img,
          format: 'jpg',
          filename: `threads_${idx + 1}.jpg`
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Threads native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
