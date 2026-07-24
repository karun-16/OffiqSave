import { InstagramParser } from '../instagram/Parser';
import { ThreadsParsedResult } from './Types';

export class ThreadsParser {
  public static parseHtml(html: string): ThreadsParsedResult | null {
    const igRes = InstagramParser.parseHtml(html);
    if (!igRes) return null;

    let videoUrl: string | undefined;
    let images: string[] = [];

    if (igRes.videos && igRes.videos.length > 0) {
      videoUrl = igRes.videos[0].video_url || igRes.videos[0].url;
    }

    if (igRes.images && igRes.images.length > 0) {
      images = igRes.images.map((img) => img.url);
    }

    return {
      mediaType: igRes.mediaType,
      title: igRes.title,
      author: igRes.author,
      thumbnail: igRes.thumbnail,
      videoUrl,
      images
    };
  }
}
