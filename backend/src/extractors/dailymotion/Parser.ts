import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { DailymotionParsedResult } from './Types';

export class DailymotionParser {
  public static parseHtml(html: string): DailymotionParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);
    let videoUrl = ogVideo;
    let title = ogTitle;
    let author = '';
    let duration = 0;

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      if (!videoUrl && typeof node.stream_hls_url === 'string') {
        videoUrl = node.stream_hls_url;
      }
      if (!title || title === ogTitle) {
        if (typeof node.title === 'string') title = node.title;
      }
      if (!author && typeof node.owner?.screenname === 'string') {
        author = node.owner.screenname;
      }
      if (!duration && typeof node.duration === 'number') {
        duration = node.duration;
      }
    });

    if (videoUrl || ogVideo) {
      return {
        title: title || 'Dailymotion Video',
        author,
        thumbnail: ogImage,
        duration,
        videoUrl: videoUrl || ogVideo
      };
    }

    return null;
  }
}
