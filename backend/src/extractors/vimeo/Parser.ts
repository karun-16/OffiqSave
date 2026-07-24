import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { VimeoParsedResult } from './Types';

export class VimeoParser {
  public static parseConfig(configJson: any): VimeoParsedResult | null {
    if (!configJson) return null;

    const title = configJson.video?.title;
    const author = configJson.video?.owner?.name;
    const thumbnail = configJson.video?.thumbs?.base || configJson.video?.thumbs?.['640'];
    const duration = configJson.video?.duration;

    const progressiveFiles = configJson.request?.files?.progressive || [];
    const formats = progressiveFiles.map((file: any) => ({
      url: file.url,
      quality: file.quality,
      width: file.width,
      height: file.height,
      fps: file.fps
    }));

    return { title, author, thumbnail, duration, formats };
  }

  public static parseHtml(html: string): VimeoParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);
    for (const obj of jsonObjects) {
      const parsed = this.parseConfig(obj);
      if (parsed && parsed.formats && parsed.formats.length > 0) {
        return parsed;
      }
    }

    return null;
  }
}
