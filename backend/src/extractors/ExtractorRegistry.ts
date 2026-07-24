import { MediaExtractor } from '../common/types';
import { InstagramExtractor } from './instagram/Extractor';
import { TwitterExtractor } from './twitter/Extractor';
import { FacebookExtractor } from './facebook/Extractor';
import { PinterestExtractor } from './pinterest/Extractor';
import { TikTokExtractor } from './tiktok/Extractor';
import { YouTubeExtractor } from './youtube/Extractor';
import { RedditExtractor } from './reddit/Extractor';
import { ThreadsExtractor } from './threads/Extractor';
import { LinkedInExtractor } from './linkedin/Extractor';
import { VimeoExtractor } from './vimeo/Extractor';
import { DailymotionExtractor } from './dailymotion/Extractor';

export class ExtractorRegistry {
  private static extractors: MediaExtractor[] = [
    new InstagramExtractor(),
    new TwitterExtractor(),
    new FacebookExtractor(),
    new PinterestExtractor(),
    new TikTokExtractor(),
    new YouTubeExtractor(),
    new RedditExtractor(),
    new ThreadsExtractor(),
    new LinkedInExtractor(),
    new VimeoExtractor(),
    new DailymotionExtractor()
  ];

  /**
   * Registers a new platform extractor.
   */
  public static register(extractor: MediaExtractor): void {
    // Unshift to allow overriding or priority placement
    this.extractors.unshift(extractor);
  }

  /**
   * Finds an extractor supporting the given URL.
   */
  public static findExtractor(url: string): MediaExtractor | null {
    for (const extractor of this.extractors) {
      if (extractor.supports(url)) {
        return extractor;
      }
    }
    return null;
  }

  /**
   * Lists all registered extractors.
   */
  public static getRegisteredExtractors(): MediaExtractor[] {
    return [...this.extractors];
  }
}
