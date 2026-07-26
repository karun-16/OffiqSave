import ytDlp from 'yt-dlp-exec';
import { cleanUrl } from '../utils/urlCleaner';
import { DownloaderPipeline } from '../downloader/DownloaderPipeline';
import { FFmpegPipeline, SupportedFormat } from '../ffmpeg/FFmpegPipeline';
import { MediaInfo as CommonMediaInfo } from '../common/types';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface MediaInfo {
    title: string;
    thumbnail: string;
    duration: number;
    platform: string;
    uploader?: string;
    uploader_url?: string;
    formats: any[];
    videos?: any[];
    mediaType: 'video' | 'audio' | 'image' | 'gallery';
    images?: Array<{ id: string; url: string; width?: number; height?: number; format: string }>;
}

export class DownloaderService {
    private static versionChecked = false;

    static async checkYtDlpVersion() {
        if (this.versionChecked) return;
        try {
            const version = await ytDlp('', { version: true });
            console.log(`[yt-dlp] Using version: ${version}`);
            this.versionChecked = true;
        } catch (e) {
            console.warn(`[yt-dlp] Warning: Could not detect yt-dlp version.`);
        }
    }

    static async getMediaInfo(rawUrl: string): Promise<any> {
        try {
            await this.checkYtDlpVersion();
            const url = cleanUrl(rawUrl);
            const commonInfo: CommonMediaInfo = await DownloaderPipeline.getInfo(url);

            // Return backwards compatible object structure for controllers and legacy clients
            return {
                title: commonInfo.title || 'Media File',
                thumbnail: commonInfo.thumbnail || '',
                duration: commonInfo.duration || 0,
                platform: commonInfo.platform,
                uploader: commonInfo.author || undefined,
                formats: commonInfo.formats || [],
                videos: commonInfo.videos || undefined,
                images: commonInfo.images || [],
                mediaType: commonInfo.mediaType.toLowerCase(),
                source: commonInfo.source
            };
        } catch (error: any) {
            console.error('[downloaderService.ts] Error inside getMediaInfo:', error);
            throw error;
        }
    }

    /**
     * Optimized yt-dlp file download for YouTube media transfer.
     */
    private static async downloadWithYtDlp(url: string, formatExpr: string): Promise<string> {
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const fileId = uuidv4();
        const outputTemplate = path.join(tmpDir, `${fileId}.%(ext)s`);

        console.log(`[yt-dlp DOWNLOAD] Transferring YouTube media via yt-dlp format: '${formatExpr}'...`);
        await ytDlp(url, {
            format: formatExpr,
            output: outputTemplate,
            noWarnings: true,
            preferFreeFormats: true
        });

        // Find the created file in tmp matching fileId
        const files = fs.readdirSync(tmpDir);
        const matchFile = files.find(f => f.startsWith(fileId));
        if (!matchFile) {
            throw new Error(`yt-dlp completed but output file with prefix ${fileId} was not found in ${tmpDir}`);
        }

        return path.join(tmpDir, matchFile);
    }

    static async downloadMedia(rawUrl: string, formatId: string): Promise<string> {
        const url = cleanUrl(rawUrl);
        const info = await DownloaderPipeline.getInfo(url);

        let match: any = null;
        const isAudioReq = formatId === 'bestaudio/best' || formatId.startsWith('bestaudio') || formatId.includes('audio');

        if (isAudioReq) {
            const allFormats = info.formats || [];
            // Filter candidates with acodec !== 'none'
            const audioCandidates = allFormats.filter((f: any) => f.acodec && f.acodec !== 'none');
            
            // Prefer audio-only candidates (vcodec === 'none' or !vcodec)
            const audioOnlyCandidates = audioCandidates.filter((f: any) => !f.vcodec || f.vcodec === 'none');

            const pool = audioOnlyCandidates.length > 0 ? audioOnlyCandidates : audioCandidates;

            if (pool.length > 0) {
                pool.sort((a: any, b: any) => {
                    // Signal 1: abr (average audio bitrate in kbps)
                    const aAbr = typeof a.abr === 'number' && a.abr > 0 ? a.abr : 0;
                    const bAbr = typeof b.abr === 'number' && b.abr > 0 ? b.abr : 0;
                    if (bAbr !== aAbr) return bAbr - aAbr;

                    // Signal 2: audio bitrate / bitrate
                    const aBitrate = typeof a.bitrate === 'number' && a.bitrate > 0 ? a.bitrate : 0;
                    const bBitrate = typeof b.bitrate === 'number' && b.bitrate > 0 ? b.bitrate : 0;
                    if (bBitrate !== aBitrate) return bBitrate - aBitrate;

                    // Signal 3: tbr (total bitrate)
                    const aTbr = typeof a.tbr === 'number' && a.tbr > 0 ? a.tbr : 0;
                    const bTbr = typeof b.tbr === 'number' && b.tbr > 0 ? b.tbr : 0;
                    if (bTbr !== aTbr) return bTbr - aTbr;

                    // Signal 4: filesize / filesize_approx as fallback
                    const aSize = a.filesize || a.filesize_approx || 0;
                    const bSize = b.filesize || b.filesize_approx || 0;
                    if (bSize !== aSize) return bSize - aSize;

                    return 0;
                });
                match = pool[0];
            }
        }

        if (!match && info.formats && info.formats.length > 0) {
            match = info.formats.find((f: any) => f.id === formatId || f.format_id === formatId);
        }

        if (!match && info.videos && info.videos.length > 0) {
            for (const v of info.videos) {
                const found = v.formats.find((f: any) => f.id === formatId || f.format_id === formatId);
                if (found) {
                    match = found;
                    break;
                }
            }
        }

        if (!match && isAudioReq) {
            match = info.formats?.find((f: any) => f.acodec && f.acodec !== 'none');
        }

        const isYouTube = info.platform === 'YouTube' || url.includes('youtube.com') || url.includes('youtu.be');
        const isRedditVideo = (info.platform === 'Reddit' || url.includes('reddit.com') || url.includes('redd.it')) && (info.mediaType === 'VIDEO');

        if ((!match || match.acodec === 'none') && isAudioReq && (isYouTube || isRedditVideo)) {
            match = { id: 'bestaudio/best', format_id: 'bestaudio/best', acodec: 'audio', vcodec: 'none' };
        }

        if (!match && info.formats && info.formats.length > 0) {
            match = info.formats[0];
        }

        if (!match && info.images && info.images.length > 0) {
            return DownloaderPipeline.downloadToLocalFile(info.images[0].url, 'jpg');
        } else if (!match && info.thumbnail) {
            return DownloaderPipeline.downloadToLocalFile(info.thumbnail, 'jpg');
        }

        if (!match) {
            throw new Error(`No downloadable media format found for formatId: ${formatId}`);
        }

        // SAFETY CHECK: If audio requested but selected format has no audio
        if (isAudioReq && (!match.acodec || match.acodec === 'none') && !isYouTube && !isRedditVideo) {
            throw new Error(`Selected format (${match.format_id || match.id}) contains no audio stream (acodec is none).`);
        }

        const ext = match.ext || (match.acodec && match.acodec !== 'none' ? 'm4a' : 'mp4');
        console.log(`[TRACE DOWNLOAD] Selected format_id: ${match.format_id || match.id}, ext: ${ext}, acodec: ${match.acodec}, vcodec: ${match.vcodec}, abr: ${match.abr}, bitrate: ${match.bitrate}`);

        let localPath = '';
        if (isYouTube || isRedditVideo) {
            if (isAudioReq) {
                const selectedFormatId = (match && match.acodec && match.acodec !== 'none') ? (match.format_id || match.id) : 'bestaudio/best';
                localPath = await this.downloadWithYtDlp(url, selectedFormatId);
            } else {
                const selectedFormatId = match.format_id || match.id || 'best';
                const hasBoth = match.vcodec && match.vcodec !== 'none' && match.acodec && match.acodec !== 'none';
                const formatExpr = hasBoth ? `${selectedFormatId}` : `${selectedFormatId}+bestaudio/best`;
                localPath = await this.downloadWithYtDlp(url, formatExpr);
            }
        } else {
            // Non-YouTube / non-Reddit-video platforms remain 100% unchanged
            if (!match.url) {
                throw new Error(`No downloadable media URL found for formatId: ${formatId}`);
            }
            localPath = await DownloaderPipeline.downloadToLocalFile(match.url, ext);
        }

        // SAFETY CHECK: Verify downloaded file exists and is not empty
        if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
            throw new Error(`Downloaded media file is missing or empty at path: ${localPath}`);
        }

        return localPath;
    }

    static convertMedia(inputPath: string, targetFormat: string): Promise<string> {
        return FFmpegPipeline.convert(inputPath, targetFormat as SupportedFormat);
    }

    static async downloadImageDirect(imageUrl: string): Promise<string> {
        const extMatch = imageUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
        return DownloaderPipeline.downloadToLocalFile(imageUrl, ext === 'jpeg' ? 'jpg' : ext);
    }
}
