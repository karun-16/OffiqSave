import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { PinterestParsedResult } from './Types';
import { PinterestUtils } from './Utils';

export class PinterestParser {
  public static parseHtml(html: string): PinterestParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);

    let videoUrl = ogVideo;
    let images: string[] = [];
    let title = ogTitle;
    let author = '';

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      // Video streams
      if (!videoUrl && node.v720p?.url) videoUrl = node.v720p.url;
      if (!videoUrl && node.vEXP?.url) videoUrl = node.vEXP.url;
      if (!videoUrl && typeof node.video_list?.V_720P?.url === 'string') videoUrl = node.video_list.V_720P.url;

      // Author
      if (!author) {
        if (node.pinner?.username) author = `@${node.pinner.username}`;
        else if (node.owner?.username) author = `@${node.owner.username}`;
      }

      // Title
      if (!title || title === ogTitle) {
        if (typeof node.title === 'string' && node.title.length > 2) title = node.title;
        else if (typeof node.grid_title === 'string') title = node.grid_title;
      }

      // Original images
      if (node.images?.originals?.url) {
        images.push(node.images.originals.url);
      }
    });

    if (ogImage && images.length === 0) {
      images.push(PinterestUtils.getOriginalImageUrl(ogImage));
    }

    if (videoUrl) {
      return {
        mediaType: 'VIDEO',
        title: title || 'Pinterest Video',
        author,
        thumbnail: images[0] || ogImage,
        videoUrl
      };
    }

    if (images.length > 0) {
      return {
        mediaType: images.length > 1 ? 'GALLERY' : 'IMAGE',
        title: title || 'Pinterest Pin',
        author,
        thumbnail: images[0],
        images
      };
    }

    return null;
  }
}
