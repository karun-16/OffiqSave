import * as cheerio from 'cheerio';
import { RedditParsedResult } from './Types';

function unescapeUrl(urlStr?: string): string | undefined {
  if (!urlStr) return undefined;
  return urlStr.replace(/&amp;/g, '&');
}

export class RedditParser {
  public static parseJson(json: any): RedditParsedResult | null {
    const postData = json?.[0]?.data?.children?.[0]?.data || json?.data?.children?.[0]?.data;
    if (!postData) return null;

    const title = postData.title;
    const author = postData.author ? `u/${postData.author}` : '';
    const rawThumb = postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : undefined;
    const thumbnail = unescapeUrl(rawThumb);

    // Reddit hosted video
    if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
      return {
        mediaType: 'VIDEO',
        title,
        author,
        thumbnail,
        videoUrl: unescapeUrl(postData.media.reddit_video.fallback_url)
      };
    }

    // Gallery
    if (postData.is_gallery && postData.media_metadata) {
      const images: string[] = [];
      if (postData.gallery_data?.items && Array.isArray(postData.gallery_data.items)) {
        for (const item of postData.gallery_data.items) {
          const media = postData.media_metadata[item.media_id];
          const rawUrl = media?.s?.u || media?.s?.gif;
          const clean = unescapeUrl(rawUrl);
          if (clean && !images.includes(clean)) {
            images.push(clean);
          }
        }
      } else {
        for (const itemKey of Object.keys(postData.media_metadata)) {
          const item = postData.media_metadata[itemKey];
          const rawUrl = item.s?.u || item.s?.gif;
          const clean = unescapeUrl(rawUrl);
          if (clean && !images.includes(clean)) {
            images.push(clean);
          }
        }
      }

      if (images.length > 0) {
        return {
          mediaType: 'GALLERY',
          title,
          author,
          thumbnail: images[0],
          images
        };
      }
    }

    // Direct Image / GIF
    if (postData.url && (postData.url.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i) || postData.url.includes('i.redd.it'))) {
      const cleanImg = unescapeUrl(postData.url);
      if (cleanImg) {
        return {
          mediaType: 'IMAGE',
          title,
          author,
          thumbnail: cleanImg,
          images: [cleanImg]
        };
      }
    }

    // Preview image fallback
    if (postData.preview?.images?.[0]?.source?.url) {
      const prevUrl = unescapeUrl(postData.preview.images[0].source.url);
      if (prevUrl && !prevUrl.includes('external-preview')) {
        return {
          mediaType: 'IMAGE',
          title,
          author,
          thumbnail: prevUrl,
          images: [prevUrl]
        };
      }
    }

    return null;
  }

  public static parseHtml(html: string): RedditParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = unescapeUrl($('meta[property="og:image"]').attr('content')) || '';
    const ogVideo = unescapeUrl($('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content')) || '';

    if (ogVideo) {
      return { mediaType: 'VIDEO', title: ogTitle, thumbnail: ogImage, videoUrl: ogVideo };
    }
    if (ogImage) {
      return { mediaType: 'IMAGE', title: ogTitle, thumbnail: ogImage, images: [ogImage] };
    }
    return null;
  }
}
