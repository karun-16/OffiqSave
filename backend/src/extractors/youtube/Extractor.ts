import { MediaExtractor, MediaInfo } from '../../common/types';
import { ExtractorError } from '../../common/errors';
import { YouTubeParser } from './Parser';

export class YouTubeExtractor implements MediaExtractor {
  public platform(): string {
    return 'YouTube';
  }

  public supports(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('youtube-nocookie.com');
  }

  public async extract(url: string): Promise<MediaInfo> {
    try {
      const parsed = await YouTubeParser.parseWithYtDlp(url);

      return {
        platform: this.platform(),
        mediaType: 'VIDEO',
        title: parsed.title || 'YouTube Video',
        author: parsed.author || '',
        thumbnail: parsed.thumbnail || '',
        duration: parsed.duration || 0,
        formats: parsed.formats || [],
        source: 'yt-dlp Primary'
      };
    } catch (err: any) {
      throw new ExtractorError(err.message || 'YouTube extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
