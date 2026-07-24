import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { FacebookParsedResult } from './Types';
import { FacebookUtils } from './Utils';

export class FacebookParser {
  public static parseHtml(html: string): FacebookParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    // Regex check for direct playable video URLs in script tags
    const hdMatch = html.match(/browser_native_hd_url["']\s*:\s*["']([^"']+)["']/i) || html.match(/playable_url_quality_hd["']\s*:\s*["']([^"']+)["']/i);
    const sdMatch = html.match(/browser_native_sd_url["']\s*:\s*["']([^"']+)["']/i) || html.match(/playable_url["']\s*:\s*["']([^"']+)["']/i);

    const hdUrl = hdMatch && hdMatch[1] ? FacebookUtils.decodeEscapedUrl(hdMatch[1]) : undefined;
    const sdUrl = sdMatch && sdMatch[1] ? FacebookUtils.decodeEscapedUrl(sdMatch[1]) : undefined;

    if (hdUrl || sdUrl) {
      return {
        mediaType: 'VIDEO',
        title: ogTitle || 'Facebook Video',
        thumbnail: ogImage,
        hdUrl,
        sdUrl
      };
    }

    // Try GraphQL JSON discovery
    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);
    let foundHd: string | undefined;
    let foundSd: string | undefined;
    let title = ogTitle;
    let thumbnail = ogImage;
    const images: string[] = [];

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      if (!foundHd && typeof node.playable_url_quality_hd === 'string') {
        foundHd = FacebookUtils.decodeEscapedUrl(node.playable_url_quality_hd);
      }
      if (!foundSd && typeof node.playable_url === 'string') {
        foundSd = FacebookUtils.decodeEscapedUrl(node.playable_url);
      }
      if (!thumbnail && typeof node.preferred_thumbnail?.image?.uri === 'string') {
        thumbnail = node.preferred_thumbnail.image.uri;
      }
      if (typeof node.image?.uri === 'string' && !images.includes(node.image.uri)) {
        images.push(node.image.uri);
      }
    });

    if (foundHd || foundSd) {
      return {
        mediaType: 'VIDEO',
        title: title || 'Facebook Video',
        thumbnail: thumbnail || ogImage,
        hdUrl: foundHd,
        sdUrl: foundSd
      };
    }

    if (images.length > 0 || ogImage) {
      const finalImages = images.length > 0 ? images : [ogImage];
      return {
        mediaType: finalImages.length > 1 ? 'GALLERY' : 'IMAGE',
        title: title || 'Facebook Post',
        thumbnail: finalImages[0],
        images: finalImages
      };
    }

    return null;
  }
}
