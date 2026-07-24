import { MediaExtractor, MediaInfo } from '../../common/types';
import { HtmlFetcher } from '../../common/HtmlFetcher';
import { ExtractorError } from '../../common/errors';
import { VimeoUtils } from './Utils';
import { VimeoParser } from './Parser';

export class VimeoExtractor implements MediaExtractor {
  public platform(): string {
    return 'Vimeo';
  }

  public supports(url: string): boolean {
    return url.toLowerCase().includes('vimeo.com');
  }

  public async extract(url: string): Promise<MediaInfo> {
    const videoId = VimeoUtils.extractVideoId(url);

    try {
      if (videoId) {
        try {
          const configUrl = `https://player.vimeo.com/video/${videoId}/config`;
          const configText = await HtmlFetcher.fetch(configUrl);
          const configJson = JSON.parse(configText);
          const parsed = VimeoParser.parseConfig(configJson);

          if (parsed && parsed.formats && parsed.formats.length > 0) {
            return {
              platform: this.platform(),
              mediaType: 'VIDEO',
              title: parsed.title || `Vimeo Video ${videoId}`,
              author: parsed.author || '',
              thumbnail: parsed.thumbnail || '',
              duration: parsed.duration || 0,
              formats: parsed.formats.map((f, idx) => ({
                id: `vim-${idx}`,
                url: f.url,
                ext: 'mp4',
                quality: f.quality || `${f.height}p`,
                width: f.width,
                height: f.height,
                vcodec: 'h264',
                acodec: 'aac',
                format_id: `mp4_${f.quality || idx}`,
                format_note: `${f.quality || 'MP4'} Video`
              })),
              source: 'Native Vimeo Extractor'
            };
          }
        } catch (_) {}
      }

      // Fallback: fetch HTML directly
      const html = await HtmlFetcher.fetch(url);
      const parsedHtml = VimeoParser.parseHtml(html);

      if (!parsedHtml || !parsedHtml.formats || parsedHtml.formats.length === 0) {
        throw new ExtractorError('Vimeo player configuration not found natively.', 'NOT_FOUND', this.platform());
      }

      return {
        platform: this.platform(),
        mediaType: 'VIDEO',
        title: parsedHtml.title || 'Vimeo Video',
        author: parsedHtml.author || '',
        thumbnail: parsedHtml.thumbnail || '',
        duration: parsedHtml.duration || 0,
        formats: parsedHtml.formats.map((f, idx) => ({
          id: `vim-${idx}`,
          url: f.url,
          ext: 'mp4',
          quality: f.quality || `${f.height}p`,
          width: f.width,
          height: f.height,
          vcodec: 'h264',
          acodec: 'aac',
          format_id: `mp4_${idx}`,
          format_note: 'MP4 Video'
        })),
        source: 'Native Vimeo Extractor'
      };
    } catch (err: any) {
      if (err instanceof ExtractorError) throw err;
      throw new ExtractorError(err.message || 'Vimeo native extraction failed', 'EXTRACTION_FAILED', this.platform(), err);
    }
  }
}
