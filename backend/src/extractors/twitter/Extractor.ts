import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { TwitterUtils } from './Utils';
import { TwitterParser } from './Parser';

export class TwitterExtractor implements MediaExtractor {
  public platform(): string {
    return 'Twitter';
  }

  public supports(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
      return (
        hostname === 'twitter.com' ||
        hostname.endsWith('.twitter.com') ||
        hostname === 'x.com' ||
        hostname.endsWith('.x.com') ||
        hostname === 't.co'
      );
    } catch (_) {
      return false;
    }
  }

  public async extract(url: string): Promise<MediaInfo> {
    const { canonicalUrl, tweetId } = TwitterUtils.normalizeUrl(url);

    try {
      let parsed = TwitterParser.parseHtml(await HtmlFetcher.fetch(canonicalUrl));

      // If html parsing did not find video_info / variants, check Twitter syndication API
      if (!parsed || parsed.mediaType !== 'VIDEO' || !parsed.variants || parsed.variants.length === 0) {
        if (tweetId) {
          try {
            const synUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=x`;
            const synText = await HtmlFetcher.fetch(synUrl);
            const synJson = JSON.parse(synText);
            const synParsed = TwitterParser.parseJson(synJson);
            if (synParsed && synParsed.mediaType === 'VIDEO') {
              parsed = synParsed;
            } else if (!parsed && synParsed) {
              parsed = synParsed;
            }
          } catch (_) {}
        }
      }

      if (!parsed) {
        throw new ExtractorError('Unable to extract Twitter post media natively.', 'NOT_FOUND', this.platform());
      }

      const mediaInfo: MediaInfo = {
        platform: this.platform(),
        mediaType: parsed.mediaType,
        title: parsed.title || `Tweet ${tweetId}`,
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        duration: parsed.duration || 0,
        source: 'Native Twitter Extractor'
      };

      if (parsed.mediaType === 'VIDEO') {
        mediaInfo.images = undefined; // Never populate images array for video

        if (parsed.variants && parsed.variants.length > 0) {
          mediaInfo.formats = parsed.variants.map((v, idx) => ({
            id: `tw-fmt-${idx}`,
            url: v.url,
            ext: 'mp4',
            quality: v.bitrate ? `${Math.round(v.bitrate / 1000)}k` : 'HD',
            bitrate: v.bitrate,
            vcodec: 'h264',
            acodec: 'aac',
            format_id: `mp4_${idx}`,
            format_note: 'MP4 Video'
          }));
        }

        if (parsed.videos && parsed.videos.length > 0) {
          mediaInfo.videos = parsed.videos.map((vid, vIdx) => {
            const videoFormats = vid.variants.map((v, fIdx) => ({
              id: `tw-v${vIdx}-fmt-${fIdx}`,
              url: v.url,
              ext: 'mp4',
              quality: v.bitrate ? `${Math.round(v.bitrate / 1000)}k` : 'HD',
              bitrate: v.bitrate,
              vcodec: 'h264',
              acodec: 'aac',
              format_id: `video_${vIdx}_mp4_${fIdx}`,
              format_note: `MP4 Video ${vIdx + 1}`
            }));

            return {
              id: vid.id || `video_${vIdx}`,
              thumbnail: vid.thumbnail || parsed.thumbnail,
              duration: vid.duration,
              formats: videoFormats
            };
          });
        }
      } else if (parsed.images && parsed.images.length > 0) {
        mediaInfo.images = parsed.images.map((img, idx) => ({
          id: `tw-img-${idx}`,
          url: img.url,
          downloadUrl: img.url,
          format: 'jpg',
          filename: `tweet_${tweetId}_${idx + 1}.jpg`
        }));
      }

      return mediaInfo;
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Twitter native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
