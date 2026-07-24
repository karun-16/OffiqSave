import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { DailymotionUtils } from './Utils';
import { DailymotionParser } from './Parser';

export class DailymotionExtractor implements MediaExtractor {
  public platform(): string {
    return 'Dailymotion';
  }

  public supports(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('dailymotion.com') || lower.includes('dai.ly');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const videoId = DailymotionUtils.extractVideoId(url);

    try {
      if (videoId) {
        try {
          const apiRes = await HtmlFetcher.fetch(`https://api.dailymotion.com/video/${videoId}?fields=title,owner.screenname,thumbnail_url,duration`);
          const json = JSON.parse(apiRes);
          if (json && json.title) {
            return {
              platform: this.platform(),
              mediaType: 'VIDEO',
              title: json.title,
              author: json['owner.screenname'] || '',
              thumbnail: json.thumbnail_url || '',
              duration: json.duration || 0,
              formats: [{
                id: 'dm-hls',
                url: `https://www.dailymotion.com/embed/video/${videoId}`,
                ext: 'mp4',
                quality: 'HD',
                format_id: 'hls',
                format_note: 'Dailymotion Video'
              }],
              source: 'Native Dailymotion API'
            };
          }
        } catch (_) {}
      }

      const html = await HtmlFetcher.fetch(url);
      const parsed = DailymotionParser.parseHtml(html);

      if (!parsed || !parsed.videoUrl) {
        throw new ExtractorError('Dailymotion media could not be parsed natively.', 'NOT_FOUND', this.platform());
      }

      return {
        platform: this.platform(),
        mediaType: 'VIDEO',
        title: parsed.title || 'Dailymotion Video',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        duration: parsed.duration || 0,
        formats: [{
          id: 'dm-vid',
          url: parsed.videoUrl,
          ext: 'mp4',
          quality: 'HD',
          format_id: 'mp4',
          format_note: 'Dailymotion Video'
        }],
        source: 'Native Dailymotion Extractor'
      };
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Dailymotion native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
