import ytDlp from 'yt-dlp-exec';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cleanUrl } from '../utils/urlCleaner';
import { HandlerFactory } from './handlers/HandlerFactory';

const TMP_DIR = path.join(__dirname, '../../tmp');

export interface MediaInfo {
    title: string;
    thumbnail: string;
    duration: number;
    platform: string;
    uploader?: string;
    uploader_url?: string;
    formats: any[];
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
            // Simple string check, in production we'd parse semver, but for now just logging it ensures it's checked
            this.versionChecked = true;
        } catch (e) {
            console.warn(`[yt-dlp] Warning: Could not detect yt-dlp version. Is it installed correctly?`);
        }
    }

    static async getMediaInfo(rawUrl: string): Promise<MediaInfo> {
        try {
            console.log('[downloaderService.ts] Inside DownloaderService.getMediaInfo()');
            await this.checkYtDlpVersion();
            const url = cleanUrl(rawUrl);
            
            console.log('[downloaderService.ts] Before HandlerFactory');
            const handler = HandlerFactory.getHandler(url);
            console.log('[downloaderService.ts] After handler creation, handler type:', handler.constructor.name);
            
            console.log('[downloaderService.ts] Before handler.getInfo()');
            return await handler.getInfo(url);
        } catch (error: any) {
            console.error('[downloaderService.ts] Error inside catch block:', error);
            console.error(error.stack);
            throw error;
        }
    }

    static async downloadMedia(rawUrl: string, formatId: string): Promise<string> {
        const url = cleanUrl(rawUrl);
        const handler = HandlerFactory.getHandler(url);
        return handler.download(url, formatId);
    }

    static convertMedia(inputPath: string, targetFormat: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const fileId = uuidv4();
            const outputPath = path.join(TMP_DIR, `${fileId}.${targetFormat}`);
            
            ffmpeg(inputPath)
                .toFormat(targetFormat)
                .on('end', () => resolve(outputPath))
                .on('error', (err: any) => reject(err))
                .save(outputPath);
        });
    }
}
