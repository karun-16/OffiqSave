import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { RedditUtils } from './Utils';
import { RedditParser } from './Parser';

export class RedditExtractor implements MediaExtractor {
  public platform(): string {
    return 'Reddit';
  }

  public supports(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      return (
        hostname === 'reddit.com' ||
        hostname.endsWith('.reddit.com') ||
        hostname === 'redd.it' ||
        hostname.endsWith('.redd.it')
      );
    } catch (_) {
      return false;
    }
  }

  public async extract(url: string): Promise<MediaInfo> {
    const jsonUrl = RedditUtils.getJsonUrl(url);

    try {
      const rawText = await HtmlFetcher.fetch(jsonUrl, {
        headers: {
          'User-Agent': 'desktop:OffiqSave:v1.0.0 (by /u/karun)',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      let parsed: any;
      try {
        const json = JSON.parse(rawText);
        parsed = RedditParser.parseJson(json);
      } catch (_) {
        parsed = RedditParser.parseHtml(rawText);
      }

      if (!parsed) {
        throw new ExtractorError('Reddit media not found natively.', 'NOT_FOUND', this.platform());
      }

      // If video media, route to yt-dlp for DASH video + audio stream merging
      if (parsed.mediaType === 'VIDEO' || parsed.videoUrl) {
        throw new ExtractorError('Reddit video requires yt-dlp DASH stream merging.', 'EXTRACTION_FAILED', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || 'Reddit Post',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        source: 'Native Reddit Extractor'
      };

      if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img: string, idx: number) => {
          const extMatch = img.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
          return {
            id: `red-img-${idx}`,
            url: img,
            downloadUrl: img,
            format: ext,
            filename: `reddit_${idx + 1}.${ext}`
          };
        });
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Reddit native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
