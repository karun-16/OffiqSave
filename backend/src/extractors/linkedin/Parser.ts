import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { LinkedInParsedResult } from './Types';

export class LinkedInParser {
  public static parseHtml(html: string): LinkedInParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);
    let videoUrl = ogVideo;
    let thumbnail = ogImage;
    const images: string[] = [];

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      if (!videoUrl && typeof node.src === 'string' && node.src.includes('.mp4')) {
        videoUrl = node.src;
      }
      if (typeof node.url === 'string' && node.url.includes('media.licdn.com/dms/image') && !images.includes(node.url)) {
        images.push(node.url);
      }
    });

    if (videoUrl) {
      return {
        mediaType: 'VIDEO',
        title: ogTitle || 'LinkedIn Video',
        thumbnail,
        videoUrl
      };
    }

    if (images.length > 0 || ogImage) {
      const finalImgs = images.length > 0 ? images : [ogImage];
      return {
        mediaType: finalImgs.length > 1 ? 'GALLERY' : 'IMAGE',
        title: ogTitle || 'LinkedIn Post',
        thumbnail: finalImgs[0],
        images: finalImgs
      };
    }

    return null;
  }
}
