import ytDlp from 'yt-dlp-exec';
import { YouTubeParsedResult } from './Types';

export class YouTubeParser {
  public static async parseWithYtDlp(url: string): Promise<YouTubeParsedResult> {
    const rawData: any = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    });

    const formats = (rawData.formats || []).map((f: any) => ({
      id: f.format_id,
      url: f.url,
      ext: f.ext,
      resolution: f.resolution || (f.height ? `${f.height}p` : undefined),
      vcodec: f.vcodec,
      acodec: f.acodec,
      filesize: f.filesize,
      filesize_approx: f.filesize_approx,
      abr: f.abr,
      tbr: f.tbr,
      bitrate: f.bitrate || f.abr || f.tbr,
      format_id: f.format_id,
      format_note: f.format_note
    }));

    return {
      title: rawData.title,
      author: rawData.uploader || rawData.channel,
      thumbnail: rawData.thumbnail,
      duration: rawData.duration,
      formats
    };
  }
}
