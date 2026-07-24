import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { TikTokParsedResult } from './Types';

export class TikTokParser {
  public static parseHtml(html: string): TikTokParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);

    let videoUrl: string | undefined;
    let author: string | undefined;
    let title: string = ogTitle;
    let thumbnail: string = ogImage;
    const images: string[] = [];
    let duration = 0;

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      if (!videoUrl && typeof node.playAddr === 'string') videoUrl = node.playAddr;
      if (!videoUrl && typeof node.downloadAddr === 'string') videoUrl = node.downloadAddr;

      if (!author) {
        if (typeof node.uniqueId === 'string') author = `@${node.uniqueId}`;
        else if (node.author?.uniqueId) author = `@${node.author.uniqueId}`;
      }

      if (!title || title === ogTitle) {
        if (typeof node.desc === 'string') title = node.desc;
      }

      if (!thumbnail && typeof node.cover === 'string') thumbnail = node.cover;

      if (node.imagePostInfo?.images) {
        for (const img of node.imagePostInfo.images) {
          if (img.displayImage?.urlList?.[0]) {
            images.push(img.displayImage.urlList[0]);
          }
        }
      }
    });

    if (videoUrl) {
      return {
        mediaType: 'VIDEO',
        title: title || 'TikTok Video',
        author: author || '',
        thumbnail,
        videoUrl,
        duration
      };
    }

    if (images.length > 0) {
      return {
        mediaType: 'GALLERY',
        title: title || 'TikTok Photo Post',
        author: author || '',
        thumbnail: images[0],
        images
      };
    }

    return null;
  }
}
