import ytDlp from 'yt-dlp-exec';
import { YouTubeParsedResult } from './Types';
import fs from 'fs';
import path from 'path';

function getYouTubeCookiePath(): string | null {
  const prodCookiePath = '/etc/secrets/youtube-cookies.txt';
  if (fs.existsSync(prodCookiePath)) {
    return prodCookiePath;
  }
  const devCookiePath = path.join(process.cwd(), 'youtube-cookies.txt');
  if (fs.existsSync(devCookiePath)) {
    return devCookiePath;
  }
  return null;
}

export class YouTubeParser {
  public static async parseWithYtDlp(url: string): Promise<YouTubeParsedResult> {
    const cookiePath = getYouTubeCookiePath();
    const flags: any = {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true
    };

    if (cookiePath) {
      flags.cookies = cookiePath;
      flags.jsRuntimes = 'node';
    } else {
      flags.extractorArgs = 'youtube:player_client=android_vr,android';
    }

    const rawData: any = await ytDlp(url, flags);

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
