import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { TwitterParsedResult, TwitterMediaEntity, TwitterVariant, TwitterVideo } from './Types';
import { TwitterUtils } from './Utils';

export class TwitterParser {
  public static parseJson(json: any): TwitterParsedResult | null {
    if (!json) return null;

    let author = '';
    let title = json.text || '';
    let thumbnail = '';
    let mediaEntities: any[] = [];
    let duration = 0;

    JsonWalker.walk(json, (node) => {
      if (!node || typeof node !== 'object') return;

      if (!author) {
        if (node.user?.screen_name) author = `@${node.user.screen_name}`;
        else if (node.user?.name) author = node.user.name;
      }

      if (!title) {
        if (typeof node.text === 'string') title = node.text;
      }

      // Check media details / video_info
      if (Array.isArray(node.mediaDetails)) {
        mediaEntities = node.mediaDetails;
      } else if (node.video_info?.variants) {
        if (!mediaEntities.some(m => !!m.video_info)) {
          mediaEntities = [node];
        }
      } else if (Array.isArray(node.media) && mediaEntities.length === 0) {
        mediaEntities = node.media;
      }
    });

    if (mediaEntities.length > 0) {
      const videoMediaItems = mediaEntities.filter(
        (m) => !!m.video_info?.variants || m.type === 'video' || m.type === 'animated_gif'
      );

      if (videoMediaItems.length > 0) {
        const parsedVideos: TwitterVideo[] = videoMediaItems.map((m, idx) => {
          const rawVariants: TwitterVariant[] = m.video_info?.variants || [];
          const mp4Variants = rawVariants
            .filter((v) => v.url && v.content_type !== 'application/x-mpegURL' && (v.content_type === 'video/mp4' || v.url.includes('.mp4')))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

          const durationSec = m.video_info?.duration_millis ? Math.round(m.video_info.duration_millis / 1000) : 0;
          const vidId = m.id_str || (m.id ? String(m.id) : undefined) || m.media_key || `video_${idx}`;

          return {
            id: vidId,
            mediaKey: m.media_key,
            thumbnail: m.media_url_https || thumbnail,
            duration: durationSec,
            variants: mp4Variants.length > 0 ? mp4Variants : rawVariants.filter((v) => v.content_type !== 'application/x-mpegURL')
          };
        });

        const firstVideo = parsedVideos[0];

        return {
          mediaType: 'VIDEO',
          author,
          title,
          thumbnail: firstVideo.thumbnail || thumbnail,
          variants: firstVideo.variants,
          videos: parsedVideos,
          images: [],
          duration: firstVideo.duration || duration
        };
      }

      // ELSE IF media.type === "photo"
      const photoEntities = mediaEntities.filter((m) => m.type === 'photo' || !m.type || m.media_url_https);
      if (photoEntities.length > 0) {
        const images = photoEntities.map((m) => ({
          url: TwitterUtils.formatOriginalImageUrl(m.media_url_https || '')
        })).filter((i) => i.url.length > 0);

        return {
          mediaType: images.length > 1 ? 'GALLERY' : 'IMAGE',
          author,
          title,
          thumbnail: images[0]?.url || thumbnail,
          images
        };
      }
    }

    return null;
  }

  public static parseHtml(html: string): TwitterParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
    const ogVideo = $('meta[property="og:video:url"]').attr('content') || $('meta[name="twitter:player:stream"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);

    let author = '';
    let title = ogTitle;
    let thumbnail = ogImage;
    let mediaEntities: TwitterMediaEntity[] = [];
    let duration = 0;

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      if (!author) {
        if (node.core?.user_results?.result?.legacy?.screen_name) {
          author = `@${node.core.user_results.result.legacy.screen_name}`;
        } else if (node.user_id_str || node.screen_name) {
          author = node.screen_name ? `@${node.screen_name}` : author;
        }
      }

      if (!title || title === ogTitle) {
        if (typeof node.full_text === 'string') {
          title = node.full_text;
        } else if (typeof node.text === 'string' && node.text.length > 5) {
          title = node.text;
        }
      }

      if (Array.isArray(node.extended_entities?.media)) {
        mediaEntities = node.extended_entities.media;
      } else if (node.video_info?.variants) {
        if (!mediaEntities.some(m => !!m.video_info)) {
          mediaEntities = [node];
        }
      } else if (Array.isArray(node.entities?.media) && mediaEntities.length === 0) {
        mediaEntities = node.entities.media;
      } else if (Array.isArray(node.media) && mediaEntities.length === 0) {
        mediaEntities = node.media;
      }
    });

    if (mediaEntities.length > 0) {
      const videoMediaItems = mediaEntities.filter(
        (m) => !!m.video_info?.variants || m.type === 'video' || m.type === 'animated_gif'
      );

      if (videoMediaItems.length > 0) {
        const parsedVideos: TwitterVideo[] = videoMediaItems.map((m, idx) => {
          const rawVariants: TwitterVariant[] = m.video_info?.variants || [];
          const mp4Variants = rawVariants
            .filter((v: TwitterVariant) => v.url && v.content_type !== 'application/x-mpegURL' && (v.content_type === 'video/mp4' || v.url.includes('.mp4')))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

          const durationSec = m.video_info?.duration_millis ? Math.round(m.video_info.duration_millis / 1000) : 0;
          const vidId = m.id_str || (m.id ? String(m.id) : undefined) || m.media_key || `video_${idx}`;

          return {
            id: vidId,
            mediaKey: m.media_key,
            thumbnail: m.media_url_https || thumbnail,
            duration: durationSec,
            variants: mp4Variants.length > 0 ? mp4Variants : rawVariants.filter((v) => v.content_type !== 'application/x-mpegURL')
          };
        });

        const firstVideo = parsedVideos[0];

        return {
          mediaType: 'VIDEO',
          author,
          title,
          thumbnail: firstVideo.thumbnail || thumbnail,
          variants: firstVideo.variants,
          videos: parsedVideos,
          images: [],
          duration: firstVideo.duration || duration
        };
      }

      // ELSE IF media.type === "photo"
      const photoEntities = mediaEntities.filter((m) => m.type === 'photo');
      if (photoEntities.length > 0) {
        const images = photoEntities.map((m) => ({
          url: TwitterUtils.formatOriginalImageUrl(m.media_url_https || '')
        })).filter((i) => i.url.length > 0);

        return {
          mediaType: images.length > 1 ? 'GALLERY' : 'IMAGE',
          author,
          title,
          thumbnail: images[0]?.url || thumbnail,
          images
        };
      }
    }

    if (ogVideo) {
      return {
        mediaType: 'VIDEO',
        author,
        title,
        thumbnail: ogImage,
        variants: [{ url: ogVideo, content_type: 'video/mp4' }],
        images: []
      };
    }

    return null;
  }
}
