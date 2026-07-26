import * as cheerio from 'cheerio';
import { JsonWalker } from '../../common/JsonWalker';
import { InstagramParsedResult, InstagramMediaItem } from './Types';

export class InstagramParser {
  public static parseHtml(html: string): InstagramParsedResult | null {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogVideo = $('meta[property="og:video"]').attr('content') || $('meta[property="og:video:secure_url"]').attr('content') || '';

    const jsonObjects = JsonWalker.parseEmbeddedJsonStrings(html);
    
    // Attempt recursive Polaris JSON parsing
    const polarisRes = this.traversePolarisJson(jsonObjects, ogTitle, ogImage);
    if (polarisRes) return polarisRes;

    // OpenGraph fallback
    if (ogVideo) {
      return {
        mediaType: 'VIDEO',
        title: ogTitle || 'Instagram Video',
        thumbnail: ogImage,
        videos: [{ id: 'ig-og-v', url: ogVideo, is_video: true }]
      };
    }

    if (ogImage) {
      return {
        mediaType: 'IMAGE',
        title: ogTitle || 'Instagram Photo',
        thumbnail: ogImage,
        images: [{ id: 'ig-og-i', url: ogImage, is_video: false }]
      };
    }

    return null;
  }

  private static traversePolarisJson(jsonObjects: any[], defaultTitle: string, defaultThumb: string): InstagramParsedResult | null {
    let bestItems: InstagramMediaItem[] = [];
    let title = defaultTitle;
    let author = '';
    let thumbnail = defaultThumb;
    let isVideo = false;

    JsonWalker.walk(jsonObjects, (node) => {
      if (!node || typeof node !== 'object') return;

      // Check author
      if (!author) {
        if (typeof node.username === 'string') author = node.username;
        else if (node.owner?.username) author = node.owner.username;
      }

      // Check title / caption
      if (!title || title === defaultTitle) {
        if (typeof node.caption === 'string') title = node.caption;
        else if (node.edge_media_to_caption?.edges?.[0]?.node?.text) {
          title = node.edge_media_to_caption.edges[0].node.text;
        }
      }

      // Check thumbnail
      if (!thumbnail) {
        if (typeof node.display_url === 'string') thumbnail = node.display_url;
      }

      // Check carousel (edge_sidecar_to_children or carousel_media)
      if (Array.isArray(node.edge_sidecar_to_children?.edges)) {
        const carousel: InstagramMediaItem[] = [];
        for (const edge of node.edge_sidecar_to_children.edges) {
          const child = edge.node;
          if (child) {
            if (child.is_video && child.video_url) {
              carousel.push({ id: child.id || `car-${carousel.length}`, url: child.display_url || child.video_url, video_url: child.video_url, is_video: true });
            } else if (child.display_url) {
              carousel.push({ id: child.id || `car-${carousel.length}`, url: child.display_url, is_video: false });
            }
          }
        }
        if (carousel.length > 0) {
          bestItems = carousel;
          return true; // found carousel
        }
      }

      if (Array.isArray(node.carousel_media)) {
        const carousel: InstagramMediaItem[] = [];
        for (const child of node.carousel_media) {
          if (child.video_versions?.[0]?.url) {
            carousel.push({ id: child.id || `car-${carousel.length}`, url: child.image_versions2?.candidates?.[0]?.url || child.video_versions[0].url, video_url: child.video_versions[0].url, is_video: true });
          } else if (child.image_versions2?.candidates?.[0]?.url) {
            carousel.push({ id: child.id || `car-${carousel.length}`, url: child.image_versions2.candidates[0].url, is_video: false });
          }
        }
        if (carousel.length > 0) {
          bestItems = carousel;
          return true;
        }
      }

      // Check video versions
      if (Array.isArray(node.video_versions) && node.video_versions.length > 0) {
        const bestVideo = node.video_versions.reduce((prev: any, curr: any) => {
          return (curr.width || 0) * (curr.height || 0) > (prev.width || 0) * (prev.height || 0) ? curr : prev;
        }, node.video_versions[0]);

        if (bestVideo && bestVideo.url) {
          isVideo = true;
          bestItems = [{ id: 'ig-vid', url: bestVideo.url, video_url: bestVideo.url, is_video: true, width: bestVideo.width, height: bestVideo.height }];
        }
      } else if (typeof node.video_url === 'string') {
        isVideo = true;
        bestItems = [{ id: 'ig-vid', url: node.video_url, video_url: node.video_url, is_video: true }];
      } else if (!isVideo && bestItems.length === 0) {
        const bestImg = InstagramParser.extractBestSingleImageUrl(node);
        if (bestImg) {
          bestItems = [{ id: 'ig-img', url: bestImg.url, is_video: false, width: bestImg.width, height: bestImg.height }];
        }
      }
    });

    if (bestItems.length === 0) return null;

    if (bestItems.length > 1) {
      return {
        mediaType: 'GALLERY',
        title: title || 'Instagram Gallery',
        author,
        thumbnail: thumbnail || bestItems[0].url,
        images: bestItems
      };
    }

    if (isVideo || bestItems[0].is_video) {
      return {
        mediaType: 'VIDEO',
        title: title || 'Instagram Video',
        author,
        thumbnail: thumbnail || bestItems[0].url,
        videos: bestItems
      };
    }

    return {
      mediaType: 'IMAGE',
      title: title || 'Instagram Photo',
      author,
      thumbnail: thumbnail || bestItems[0].url,
      images: bestItems
    };
  }

  private static extractBestSingleImageUrl(node: any): { url: string; width?: number; height?: number } | null {
    if (!node || typeof node !== 'object') return null;

    // Priority 1: node.image_versions2.candidates (largest area/resolution)
    if (Array.isArray(node.image_versions2?.candidates) && node.image_versions2.candidates.length > 0) {
      const candidates = node.image_versions2.candidates;
      const best = candidates.reduce((max: any, curr: any) => {
        if (!curr || typeof curr.url !== 'string') return max;
        const maxArea = (max?.width || 0) * (max?.height || 0);
        const currArea = (curr.width || 0) * (curr.height || 0);
        return currArea > maxArea ? curr : max;
      }, candidates[0]);

      if (best && typeof best.url === 'string') {
        return { url: best.url, width: best.width, height: best.height };
      }
    }

    // Priority 2: node.display_resources (largest area config_width * config_height)
    if (Array.isArray(node.display_resources) && node.display_resources.length > 0) {
      const resources = node.display_resources;
      const best = resources.reduce((max: any, curr: any) => {
        const maxArea = (max?.config_width || max?.width || 0) * (max?.config_height || max?.height || 0);
        const currArea = (curr?.config_width || curr?.width || 0) * (curr?.config_height || curr?.height || 0);
        const currUrl = curr?.src || curr?.url;
        return (currUrl && currArea > maxArea) ? curr : max;
      }, resources[0]);

      const bestUrl = best?.src || best?.url;
      if (typeof bestUrl === 'string') {
        return { url: bestUrl, width: best?.config_width || best?.width, height: best?.config_height || best?.height };
      }
    }

    // Priority 3: node.display_url
    if (typeof node.display_url === 'string') {
      return { url: node.display_url, width: node.dimensions?.width, height: node.dimensions?.height };
    }

    return null;
  }
}
