import * as cheerio from 'cheerio';
import { RedditParsedResult, RedditImageItem } from './Types';

function decodeHtmlEntities(urlStr?: string): string | undefined {
  if (!urlStr) return undefined;
  return urlStr
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extFromUrl(urlStr: string): string {
  const match = urlStr.match(/\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

export class RedditParser {
  public static parseJson(json: any): RedditParsedResult | null {
    if (!json) return null;

    let postData = json?.[0]?.data?.children?.[0]?.data || json?.data?.children?.[0]?.data;
    if (!postData) return null;

    // Handle crosspost parent list fallback
    const targetData = (postData.crosspost_parent_list && postData.crosspost_parent_list.length > 0)
      ? postData.crosspost_parent_list[0]
      : postData;

    const id = postData.id || targetData.id || 'post';
    const title = postData.title || targetData.title || 'Reddit Post';
    const author = postData.author || targetData.author ? `u/${postData.author || targetData.author}` : '';
    const subreddit = postData.subreddit || targetData.subreddit || '';
    const permalink = postData.permalink || targetData.permalink || '';

    // Thumbnail calculation
    let rawThumb = postData.thumbnail || targetData.thumbnail;
    let thumbnail: string | undefined;
    if (rawThumb && rawThumb.startsWith('http')) {
      thumbnail = decodeHtmlEntities(rawThumb);
    }

    // 1. Reddit native video / DASH video detection
    const isVideo =
      targetData.is_video === true ||
      postData.is_video === true ||
      targetData.post_hint === 'hosted:video' ||
      postData.post_hint === 'hosted:video' ||
      !!targetData.media?.reddit_video ||
      !!targetData.secure_media?.reddit_video ||
      !!postData.media?.reddit_video ||
      !!postData.secure_media?.reddit_video;

    if (isVideo) {
      const fallbackUrl = decodeHtmlEntities(
        targetData.secure_media?.reddit_video?.fallback_url ||
        targetData.media?.reddit_video?.fallback_url ||
        postData.secure_media?.reddit_video?.fallback_url ||
        postData.media?.reddit_video?.fallback_url
      );

      return {
        id,
        title,
        author,
        subreddit,
        permalink,
        thumbnail,
        mediaType: 'VIDEO',
        isVideo: true,
        fallbackUrl
      };
    }

    // 2. Reddit Gallery Posts
    const galleryItems = targetData.gallery_data?.items || postData.gallery_data?.items;
    const mediaMetadata = targetData.media_metadata || postData.media_metadata;

    if (galleryItems && Array.isArray(galleryItems) && mediaMetadata) {
      const images: RedditImageItem[] = [];

      for (let idx = 0; idx < galleryItems.length; idx++) {
        const item = galleryItems[idx];
        const mediaId = item.media_id;
        const meta = mediaMetadata[mediaId];

        if (!meta) continue;

        const rawUrl = meta.s?.u || meta.s?.gif || meta.p?.[meta.p.length - 1]?.u;
        const cleanUrl = decodeHtmlEntities(rawUrl);

        if (!cleanUrl) continue;

        let format = 'jpg';
        if (meta.m) {
          const mimeParts = meta.m.split('/');
          if (mimeParts.length > 1) format = mimeParts[1].toLowerCase();
        } else {
          format = extFromUrl(cleanUrl);
        }

        images.push({
          id: mediaId || `gallery-${idx}`,
          url: cleanUrl,
          downloadUrl: cleanUrl,
          format: format === 'jpeg' ? 'jpg' : format,
          filename: `reddit_${id}_gallery_${idx + 1}.${format === 'jpeg' ? 'jpg' : format}`,
          width: meta.s?.x,
          height: meta.s?.y
        });
      }

      if (images.length > 0) {
        return {
          id,
          title,
          author,
          subreddit,
          permalink,
          thumbnail: images[0].url,
          mediaType: images.length === 1 ? 'IMAGE' : 'GALLERY',
          images
        };
      }
    }

    // 3. Single Image / Animated Media Posts
    const primaryUrl = decodeHtmlEntities(
      targetData.url_overridden_by_dest ||
      targetData.url ||
      postData.url_overridden_by_dest ||
      postData.url
    );

    if (primaryUrl) {
      const isDirectImageHost =
        primaryUrl.includes('i.redd.it') ||
        primaryUrl.includes('preview.redd.it') ||
        primaryUrl.includes('i.imgur.com');

      const isImageFile = !!primaryUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)($|\?)/i);
      const isPostHintImage = targetData.post_hint === 'image' || postData.post_hint === 'image';

      if (isDirectImageHost || isImageFile || isPostHintImage) {
        const ext = extFromUrl(primaryUrl);
        const imageItem: RedditImageItem = {
          id: `${id}-img`,
          url: primaryUrl,
          downloadUrl: primaryUrl,
          format: ext === 'jpeg' ? 'jpg' : ext,
          filename: `reddit_${id}_1.${ext === 'jpeg' ? 'jpg' : ext}`
        };

        return {
          id,
          title,
          author,
          subreddit,
          permalink,
          thumbnail: primaryUrl,
          mediaType: 'IMAGE',
          images: [imageItem]
        };
      }
    }

    // 4. Preview Image Fallback
    const previewImage =
      targetData.preview?.images?.[0] ||
      postData.preview?.images?.[0];

    if (previewImage?.source?.url) {
      const previewUrl = decodeHtmlEntities(previewImage.source.url);
      if (previewUrl && !previewUrl.includes('external-preview')) {
        const ext = extFromUrl(previewUrl);
        const imageItem: RedditImageItem = {
          id: `${id}-preview`,
          url: previewUrl,
          downloadUrl: previewUrl,
          format: ext === 'jpeg' ? 'jpg' : ext,
          filename: `reddit_${id}_preview.${ext === 'jpeg' ? 'jpg' : ext}`,
          width: previewImage.source.width,
          height: previewImage.source.height
        };

        return {
          id,
          title,
          author,
          subreddit,
          permalink,
          thumbnail: previewUrl,
          mediaType: 'IMAGE',
          images: [imageItem]
        };
      }
    }

    return null;
  }

  public static parseHtml(html: string): RedditParsedResult | null {
    const $ = cheerio.load(html);

    const mainThing = $('#siteTable div.thing').first().length > 0
      ? $('#siteTable div.thing').first()
      : $('div.thing').first();

    const title = mainThing.find('a.title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().replace(/\s*:\s*\w+$/i, '').trim() ||
      'Reddit Post';

    const rawAuthor = mainThing.attr('data-author') || $('a.author').first().text() || '';
    const author = rawAuthor ? `u/${rawAuthor}` : '';

    const dataUrl = mainThing.attr('data-url') || decodeHtmlEntities($('meta[property="og:url"]').attr('content')) || '';
    const isGalleryPost = dataUrl.includes('reddit.com/gallery/') || mainThing.find('.gallery-preview').length > 0;
    const isVideoPost = dataUrl.includes('v.redd.it') || $('meta[property="og:video"]').length > 0;

    // 1. Video Post
    if (isVideoPost) {
      const ogVideo = decodeHtmlEntities(
        $('meta[property="og:video"]').attr('content') ||
        $('meta[property="og:video:secure_url"]').attr('content')
      ) || '';
      return {
        mediaType: 'VIDEO',
        title,
        author,
        thumbnail: decodeHtmlEntities($('meta[property="og:image"]').attr('content')),
        fallbackUrl: ogVideo,
        isVideo: true
      };
    }

    // 2. Gallery Post
    if (isGalleryPost) {
      const galleryLinks: string[] = [];
      mainThing.find('a[href*="preview.redd.it"], a[href*="i.redd.it"], div.gallery-preview a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const clean = decodeHtmlEntities(href);
          if (clean && !galleryLinks.includes(clean) && !clean.includes('external-preview')) {
            galleryLinks.push(clean);
          }
        }
      });

      if (galleryLinks.length > 0) {
        const images: RedditImageItem[] = galleryLinks.map((link, idx) => {
          const ext = extFromUrl(link);
          return {
            id: `gal-${idx}`,
            url: link,
            downloadUrl: link,
            format: ext === 'jpeg' ? 'jpg' : ext,
            filename: `reddit_gallery_${idx + 1}.${ext === 'jpeg' ? 'jpg' : ext}`
          };
        });

        return {
          mediaType: images.length === 1 ? 'IMAGE' : 'GALLERY',
          title,
          author,
          thumbnail: images[0].url,
          images
        };
      }
    }

    // 3. Single Image Post
    const rawImgUrl = (dataUrl && (dataUrl.includes('i.redd.it') || dataUrl.includes('i.imgur.com') || dataUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|bmp)($|\?)/i)))
      ? dataUrl
      : decodeHtmlEntities($('meta[property="og:image"]').attr('content'));

    if (rawImgUrl) {
      const cleanImg = decodeHtmlEntities(rawImgUrl)!;
      const ext = extFromUrl(cleanImg);
      return {
        mediaType: 'IMAGE',
        title,
        author,
        thumbnail: cleanImg,
        images: [
          {
            id: 'img-1',
            url: cleanImg,
            downloadUrl: cleanImg,
            format: ext === 'jpeg' ? 'jpg' : ext,
            filename: `reddit_image.${ext === 'jpeg' ? 'jpg' : ext}`
          }
        ]
      };
    }

    return null;
  }
}
