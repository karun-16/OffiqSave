import ytDlp, { exec } from 'yt-dlp-exec';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ensureDir } from '../../utils/cleanup';
import { MediaInfo } from '../downloaderService'; // Will refactor this later

const TMP_DIR = path.join(__dirname, '../../../tmp');
const BROWSERS = ['chrome', 'edge', 'firefox', 'brave', 'opera'];

export abstract class BaseHandler {
    protected platformName: string = 'Generic';

    // Abstract methods for potential platform-specific overrides
    protected abstract getExtraOptions(): any;

    async getInfo(url: string): Promise<MediaInfo> {
        let lastError: any;
        const baseOptions = {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            ...this.getExtraOptions(),
        };

        // Attempt 1: Normal
        try {
            return await this.extract(url, baseOptions);
        } catch (e) {
            lastError = e;
            console.log(`[${this.platformName}] Attempt 1 failed for ${url}`);
        }

        // Attempt 2: Browser cookies
        for (const browser of BROWSERS) {
            try {
                console.log(`[${this.platformName}] Attempting with ${browser} cookies...`);
                return await this.extract(url, { ...baseOptions, cookiesFromBrowser: browser });
            } catch (e) {
                lastError = e;
            }
        }

        // Attempt 3: Generic extractor options (fallback user agent + generic extractor bypass hints if possible)
        try {
            console.log(`[${this.platformName}] Attempting with generic options...`);
            return await this.extract(url, {
                ...baseOptions,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                forceGenericExtractor: true, // Use generic extractor if native fails
            });
        } catch (e) {
            lastError = e;
            console.error(`[${this.platformName}] All attempts failed for ${url}. Last error:`, lastError?.message || lastError);
        }

        // Attempt 4: User-friendly error
        throw new Error("This media couldn't be accessed. It may require authentication, be private, or the platform has temporarily restricted access.");
    }

    async download(url: string, formatId: string): Promise<string> {
        // For downloading, we might also need to retry with cookies if it fails.
        // To keep it simple, we'll try without cookies, then with chrome cookies as a fallback.
        ensureDir(TMP_DIR);
        const fileId = uuidv4();
        const outputTemplate = path.join(TMP_DIR, `${fileId}.%(ext)s`);

        const baseOptions = {
            format: formatId,
            output: outputTemplate,
            noWarnings: true,
            noCheckCertificate: true,
            ...this.getExtraOptions(),
        };

        try {
            return await this.executeDownload(url, baseOptions, fileId);
        } catch (e) {
            // Fallback to chrome cookies
            console.log(`[${this.platformName}] Download failed, retrying with cookies...`);
            try {
                return await this.executeDownload(url, { ...baseOptions, cookiesFromBrowser: 'chrome' }, fileId);
            } catch (e2) {
                throw new Error("This media couldn't be downloaded due to platform restrictions.");
            }
        }
    }

    private async extract(url: string, options: any): Promise<MediaInfo> {
        const output: any = await ytDlp(url, options);
        return {
            title: output.title || 'Unknown Title',
            thumbnail: output.thumbnail || '',
            duration: output.duration || 0,
            platform: output.extractor_key || this.platformName,
            uploader: output.uploader,
            uploader_url: output.uploader_url,
            formats: output.formats || [],
        };
    }

    private executeDownload(url: string, options: any, fileId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = exec(url, options);

            process.on('close', (code: number) => {
                if (code === 0) {
                    const files = fs.readdirSync(TMP_DIR);
                    const downloadedFile = files.find(f => f.startsWith(fileId) && !f.endsWith('.part'));
                    if (downloadedFile) {
                        resolve(path.join(TMP_DIR, downloadedFile));
                    } else {
                        reject(new Error('Downloaded file not found'));
                    }
                } else {
                    reject(new Error('Download process failed'));
                }
            });
            process.on('error', (err: any) => reject(err));
        });
    }
}
