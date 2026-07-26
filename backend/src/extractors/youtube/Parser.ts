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
    console.log('[TRACE YT 5] Entered YouTubeParser.parseWithYtDlp');
    console.log('[TRACE YT 6] Cookie detection starting');
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
      try {
        const cookieSize = fs.statSync(cookiePath).size;
        console.log(`[TRACE YT 7] Cookie detected: YES (${cookieSize} bytes)`);
        console.log(`[YouTube Diagnostic] Cookie file detected: YES (${cookieSize} bytes)`);
      } catch (e) {
        console.log(`[TRACE YT 7] Cookie detected: YES`);
        console.log(`[YouTube Diagnostic] Cookie file detected: YES`);
      }
      console.log(`[YouTube Diagnostic] Mode: AUTHENTICATED_WEB`);
      console.log(`[YouTube Diagnostic] JS runtime requested: node`);
    } else {
      flags.extractorArgs = 'youtube:player_client=android_vr,android';
      console.log(`[TRACE YT 7] Cookie detected: NO`);
      console.log(`[YouTube Diagnostic] Cookie file detected: NO`);
      console.log(`[YouTube Diagnostic] Mode: UNAUTHENTICATED_ANDROID`);
      console.log(`[YouTube Diagnostic] JS runtime requested: none`);
    }

    let rawData: any;
    console.log('[TRACE YT 8] Calling yt-dlp');
    const startMs = performance.now();
    console.log(`[TRACE YT 8A START] Timestamp: ${new Date().toISOString()}`);
    try {
      rawData = await ytDlp(url, flags);
      const duration = (performance.now() - startMs).toFixed(2);
      console.log(`[TRACE YT 9] yt-dlp returned successfully (Duration: ${duration} ms)`);
    } catch (err: any) {
      const duration = (performance.now() - startMs).toFixed(2);
      const msg = String(err?.message || err || '');
      let category = 'UNKNOWN';
      if (msg.includes("Sign in to confirm you're not a bot")) {
        category = 'BOT_CHECK';
      } else if (msg.includes('No video formats found')) {
        category = 'NO_FORMATS';
      } else if (msg.includes('n challenge solving failed')) {
        category = 'JS_CHALLENGE';
      } else if (msg.toLowerCase().includes('cookie')) {
        category = 'COOKIE_ERROR';
      } else if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('etimedout')) {
        category = 'NETWORK_TIMEOUT';
      }

      console.error(`[TRACE YT ERROR] Stage: YT_DLP_EXECUTION | Duration: ${duration} ms | Category: ${category}`);
      console.error(`[YouTube Diagnostic] Failure category: ${category}`);
      const cleanSummary = msg.slice(0, 300).replace(/C:\\.*\\/g, '[PATH]').replace(/\n/g, ' ');
      console.error(`[TRACE YT ERROR] Message: ${cleanSummary}`);
      console.error(`[YouTube Diagnostic] Sanitized error summary: ${cleanSummary}`);
      throw err;
    }

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
