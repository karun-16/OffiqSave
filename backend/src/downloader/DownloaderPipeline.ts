import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MediaInfo, FormatMedia, ImageMedia } from '../common/types';
import { PlatformRouter } from '../router/PlatformRouter';
import { FFmpegPipeline, SupportedFormat } from '../ffmpeg/FFmpegPipeline';

const TMP_DIR = path.join(process.cwd(), 'tmp');

export class DownloaderPipeline {
  /**
   * Retrieves unified MediaInfo for any supported URL.
   */
  public static async getInfo(url: string): Promise<MediaInfo> {
    return PlatformRouter.route(url);
  }

  /**
   * Selects the highest quality format from MediaInfo.
   */
  public static getHighestQualityFormat(info: MediaInfo): FormatMedia | undefined {
    if (!info.formats || info.formats.length === 0) return undefined;
    return info.formats.reduce((best, curr) => {
      const bestRes = (best.width || 0) * (best.height || 0) || (best.bitrate || 0);
      const currRes = (curr.width || 0) * (curr.height || 0) || (curr.bitrate || 0);
      return currRes > bestRes ? curr : best;
    }, info.formats[0]);
  }

  /**
   * Downloads a media file given a target URL or MediaInfo format.
   */
  public static async downloadToLocalFile(mediaUrl: string, ext: string = 'mp4'): Promise<string> {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status} failed to download media file`);
    }

    const filePath = path.join(TMP_DIR, `${uuidv4()}.${ext}`);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    return filePath;
  }

  /**
   * Direct media conversion pipeline.
   */
  public static async convertMediaFile(inputPath: string, targetFormat: SupportedFormat): Promise<string> {
    return FFmpegPipeline.convert(inputPath, targetFormat);
  }
}
