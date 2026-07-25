import ytDlp from 'yt-dlp-exec';
import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { RedditUtils } from './Utils';
import { RedditParser } from './Parser';

const REDDIT_USER_AGENT = 'desktop:OffiqSave:v1.0.0 (by /u/karun)';

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
    const { normalizedUrl, hostname } = RedditUtils.normalizeUrl(url);
    RedditUtils.printRoutingTrace(url, normalizedUrl, hostname);

    const jsonUrl = RedditUtils.getJsonUrl(url);
    let parsed: any = null;

    // 1. Try Reddit JSON API with custom scoped User-Agent
    try {
      const response = await fetch(jsonUrl, {
        headers: {
          'User-Agent': REDDIT_USER_AGENT,
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (response.status === 404) {
        throw new ExtractorError('Reddit post not found (HTTP 404).', 'NOT_FOUND', this.platform());
      }

      if (response.ok) {
        const rawText = await response.text();
        if (rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
          const json = JSON.parse(rawText);
          parsed = RedditParser.parseJson(json);
        }
      }
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
    }

    // 2. Fallback to old.reddit.com HTML parsing if JSON API is blocked / non-JSON
    if (!parsed) {
      try {
        const oldRedditUrl = normalizedUrl.replace('www.reddit.com', 'old.reddit.com');
        const html = await HtmlFetcher.fetch(oldRedditUrl);
        parsed = RedditParser.parseHtml(html);
      } catch (err: any) {
        // Continue to check if parsed exists
      }
    }

    if (!parsed) {
      throw new ExtractorError('Reddit media not found natively.', 'NOT_FOUND', this.platform());
    }

    // 3. If video post, fetch formats via yt-dlp for DASH stream merging
    if (parsed.mediaType === 'VIDEO' || parsed.isVideo) {
      try {
        const ytRes: any = await ytDlp(url, {
          dumpSingleJson: true,
          noWarnings: true,
          noPlaylist: true
        });

        const formats: any[] = [];
        if (ytRes.formats && Array.isArray(ytRes.formats)) {
          for (const f of ytRes.formats) {
            if (f.vcodec !== 'none' && f.url) {
              formats.push({
                id: f.format_id || `fmt-${formats.length}`,
                url: f.url,
                ext: f.ext || 'mp4',
                quality: f.resolution || (f.height ? `${f.height}p` : 'HD'),
                resolution: f.resolution,
                width: f.width,
                height: f.height,
                filesize: f.filesize,
                bitrate: f.tbr || f.vbr,
                vcodec: f.vcodec,
                acodec: f.acodec,
                format_id: f.format_id,
                format_note: f.format_note
              });
            }
          }
        }

        return {
          platform: this.platform(),
          mediaType: 'VIDEO',
          title: parsed.title || ytRes.title || 'Reddit Video',
          author: parsed.author || ytRes.uploader || '',
          thumbnail: parsed.thumbnail || ytRes.thumbnail || '',
          duration: ytRes.duration || 0,
          formats: formats.length > 0 ? formats : [
            {
              id: 'best',
              url: parsed.fallbackUrl || url,
              ext: 'mp4',
              quality: 'HD',
              format_id: 'best'
            }
          ],
          source: 'Native Reddit Extractor (yt-dlp)'
        };
      } catch (_) {
        return {
          platform: this.platform(),
          mediaType: 'VIDEO',
          title: parsed.title || 'Reddit Video',
          author: parsed.author || '',
          thumbnail: parsed.thumbnail || '',
          duration: 0,
          formats: [
            {
              id: 'best',
              url: parsed.fallbackUrl || url,
              ext: 'mp4',
              quality: 'HD',
              format_id: 'best'
            }
          ],
          source: 'Native Reddit Extractor'
        };
      }
    }

    // 4. Return IMAGE or GALLERY response
    return {
      platform: this.platform(),
      mediaType: parsed.mediaType,
      title: parsed.title || 'Reddit Post',
      author: parsed.author || '',
      thumbnail: parsed.thumbnail || (parsed.images && parsed.images.length > 0 ? parsed.images[0].url : ''),
      images: parsed.images && parsed.images.length > 0 ? parsed.images : undefined,
      source: 'Native Reddit Extractor'
    };
  }
}
