import ytDlp, { exec } from 'yt-dlp-exec';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ensureDir } from '../../utils/cleanup';
import { MediaInfo } from '../downloaderService';
import NodeCache from 'node-cache';

const metaCache = new NodeCache({ stdTTL: 600 });

const TMP_DIR = path.join(process.cwd(), 'tmp');
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');
const BROWSERS = ['chrome', 'edge', 'brave', 'firefox', 'opera'];

let ytDlpVersion = 'Unknown';
exec('--version').then((res: any) => {
    if (res && res.stdout) ytDlpVersion = res.stdout.trim();
}).catch(() => {});

export abstract class BaseHandler {
    protected platformName: string = 'Generic';

    protected abstract getExtraOptions(): any;

    protected log(...args: any[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n[${this.platformName}]`, ...args);
        }
    }

    protected error(...args: any[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.error(`\n[${this.platformName}] [ERROR]`, ...args);
        }
    }

    protected normalizeUrl(urlStr: string): string {
        try {
            const parsed = new URL(urlStr);
            const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'igsh', 'fbclid', 'ref'];
            for (const param of paramsToRemove) {
                parsed.searchParams.delete(param);
            }
            return parsed.toString();
        } catch (e) {
            return urlStr;
        }
    }

    async getInfo(rawUrl: string): Promise<MediaInfo> {
        const url = this.normalizeUrl(rawUrl);
        const startTime = performance.now();
        this.log(`[Profiler] URL Validation/Normalization: ${performance.now() - startTime}ms`);
        
        const cached = metaCache.get<MediaInfo>(url);
        if (cached) {
            this.log(`[Profiler] Metadata Cache Hit: ${performance.now() - startTime}ms`);
            return cached;
        }

        this.log(`Platform detected: ${this.platformName}`);

        // 1. Try Native Extraction first
        const nativeStart = performance.now();
        try {
            const nativeInfo = await this.tryNativeExtraction(url);
            if (nativeInfo) {
                const timeStr = (performance.now() - nativeStart).toFixed(0);
                this.log(`[Pipeline] Platform: ${this.platformName} | Media: ${nativeInfo.mediaType} | Method: Native | Auth: False | Time: ${timeStr}ms | Result: SUCCESS`);
                metaCache.set(url, nativeInfo);
                return nativeInfo;
            }
        } catch (e: any) {
            this.log(`[Pipeline] Native extraction failed, falling back to yt-dlp...`, e.message);
        }
        
        const baseOptions = {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            noPlaylist: true,
            skipDownload: true, // Reduce metadata fetch time
            ...this.getExtraOptions(),
        };

        let retryCount = 1;
        let unsupportedUrl = false;
        const tryExtract = async (opts: any, label: string) => {
            const startEx = performance.now();
            try {
                const info = await this.extract(url, opts);
                this.log(`[Pipeline] Platform: ${this.platformName} | Media: ${info.mediaType} | Method: yt-dlp (${label}) | Auth: ${label !== 'Normal' && label !== 'User-Agent'} | Time: ${(performance.now() - startEx).toFixed(0)}ms | Result: SUCCESS`);
                return info;
            } catch (e: any) {
                const errMsg = e.stderr || e.message || '';
                this.error(`Attempt ${retryCount} failed. ${label} stderr:\n`, errMsg);
                if (errMsg.toLowerCase().includes('unsupported url')) {
                    unsupportedUrl = true;
                }
                return null;
            }
        };

        this.log(`Attempt ${retryCount}: Normal extraction...`);
        let info = await tryExtract(baseOptions, 'Normal');
        if (info) { metaCache.set(url, info); return info; }

        if (unsupportedUrl) {
            this.error(`[Pipeline] URL is unsupported by yt-dlp. Aborting retries.`);
            throw new Error("This media couldn't be extracted because the URL is unsupported.");
        }

        retryCount++;
        this.log(`Attempt ${retryCount}: Normal with Custom User-Agent...`);
        info = await tryExtract({
            ...baseOptions,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }, 'User-Agent');
        if (info) { metaCache.set(url, info); return info; }

        // Optimized Auth: cookies.txt FIRST
        retryCount++;
        const cookiesExist = fs.existsSync(COOKIES_FILE);
        if (cookiesExist) {
            this.log(`Attempt ${retryCount}: Using cookies.txt...`);
            info = await tryExtract({ ...baseOptions, cookies: COOKIES_FILE }, 'cookies.txt');
            if (info) { metaCache.set(url, info); return info; }
        } else {
            this.log(`Attempt ${retryCount}: cookies.txt not found. Skipping.`);
        }

        for (const browser of BROWSERS) {
            retryCount++;
            this.log(`Attempt ${retryCount}: Browser selected: ${browser}`);
            info = await tryExtract({ ...baseOptions, cookiesFromBrowser: browser }, browser);
            if (info) { metaCache.set(url, info); return info; }
        }

        const duration = performance.now() - startTime;
        this.error(`[Pipeline] Platform: ${this.platformName} | Method: yt-dlp | Result: FAILURE | Retries: ${retryCount} | Time: ${duration.toFixed(0)}ms`);
        throw new Error("This media couldn't be accessed. It may require authentication, be private, or the platform has temporarily restricted access.");
    }

    protected async tryNativeExtraction(url: string): Promise<MediaInfo | null> {
        return null;
    }

    async download(rawUrl: string, formatId: string): Promise<string> {
        const url = this.normalizeUrl(rawUrl);
        ensureDir(TMP_DIR);
        const fileId = uuidv4();
        const outputTemplate = path.join(TMP_DIR, `${fileId}.%(ext)s`);

        const formatString = formatId.includes('audio') 
            ? formatId 
            : `${formatId}+bestaudio/${formatId}/best`;

        const baseOptions = {
            format: formatString,
            output: outputTemplate,
            noWarnings: true,
            noCheckCertificate: true,
            mergeOutputFormat: 'mp4',
            concurrentFragments: 10,
            ...this.getExtraOptions(),
        };

        this.log(`Starting Download for Format ID: ${formatId}`);
        const startTime = performance.now();

        try {
            const res = await this.executeDownload(url, baseOptions, fileId);
            this.log(`Download Success: ${performance.now() - startTime}ms`);
            return res;
        } catch (e: any) {
            this.error(`Download failed. stderr:\n`, e.stderr || e.message);
            for (const browser of BROWSERS) {
                this.log(`Retrying download with browser cookies: ${browser}`);
                try {
                    const res = await this.executeDownload(url, { ...baseOptions, cookiesFromBrowser: browser }, fileId);
                    this.log(`Download Success with ${browser}: ${performance.now() - startTime}ms`);
                    return res;
                } catch (err: any) {
                    this.error(`Retry failed with ${browser}. stderr:\n`, err.stderr || err.message);
                }
            }
            this.log(`Backend working directory (process.cwd()): ${process.cwd()}`);
            this.log(`Looking for cookies: ${COOKIES_FILE}`);
            const cookiesExist = fs.existsSync(COOKIES_FILE);
            this.log(`fs.existsSync() result: ${cookiesExist}`);

            if (cookiesExist) {
                this.log(`Retrying download with cookies.txt...`);
                try {
                    const res = await this.executeDownload(url, { ...baseOptions, cookies: COOKIES_FILE }, fileId);
                    this.log(`Download Success with cookies.txt: ${performance.now() - startTime}ms`);
                    return res;
                } catch (err: any) {
                    this.error(`Retry failed with cookies.txt. stderr:\n`, err.stderr || err.message);
                }
            }
            throw new Error("This media couldn't be downloaded due to platform restrictions.");
        }
    }

    private async extract(url: string, options: any): Promise<MediaInfo> {
        const output: any = await ytDlp(url, options);
        
        let mediaType: 'video' | 'audio' | 'image' | 'gallery' = 'video';
        let images: Array<{ id: string; url: string; width?: number; height?: number; format: string }> = [];

        if (output._type === 'playlist' && output.entries) {
            mediaType = 'gallery';
            images = output.entries.map((entry: any, index: number) => {
                const imgFormat = entry.formats?.find((f: any) => f.vcodec !== 'none' || f.ext === 'jpg' || f.ext === 'png') || entry;
                return {
                    id: entry.id || `img-${index}`,
                    url: imgFormat.url || entry.url,
                    width: imgFormat.width || entry.width,
                    height: imgFormat.height || entry.height,
                    format: imgFormat.ext || entry.ext || 'jpg'
                };
            }).filter((i: any) => i.url);
            
            if (images.length === 1) {
                mediaType = 'image';
            }
        } else if (output.vcodec === 'none' && output.acodec !== 'none') {
            mediaType = 'audio';
        } else if (
            (output.formats && !output.formats.some((f: any) => f.vcodec !== 'none' && f.vcodec !== 'mjpeg' && f.acodec !== 'none')) && 
            (output.ext && !['mp4', 'webm', 'mkv', 'm4a', 'mp3'].includes(output.ext.toLowerCase())) ||
            (output.ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(output.ext.toLowerCase()))
        ) {
            // It's an image
            mediaType = 'image';
            const imgUrl = output.url || (output.thumbnails && output.thumbnails.length > 0 ? output.thumbnails[output.thumbnails.length - 1].url : '');
            if (imgUrl) {
                images = [{
                    id: output.id || 'img',
                    url: imgUrl,
                    width: output.width,
                    height: output.height,
                    format: output.ext || 'jpg'
                }];
            }
        } else {
            mediaType = 'video';
        }

        return {
            title: output.title || 'Unknown Title',
            thumbnail: output.thumbnail || (images.length > 0 ? images[0].url : ''),
            duration: output.duration || 0,
            platform: output.extractor_key || this.platformName,
            uploader: output.uploader,
            uploader_url: output.uploader_url,
            formats: output.formats || [],
            mediaType,
            images: images.length > 0 ? images : undefined
        };
    }

    private executeDownload(url: string, options: any, fileId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = exec(url, options);
            let stderrStr = '';
            
            if (process.stderr) {
                process.stderr.on('data', (data) => {
                    stderrStr += data.toString();
                });
            }

            process.on('close', (code: number) => {
                if (code === 0) {
                    const files = fs.readdirSync(TMP_DIR);
                    const downloadedFile = files.find(f => f.startsWith(fileId) && !f.endsWith('.part'));
                    if (downloadedFile) {
                        resolve(path.join(TMP_DIR, downloadedFile));
                    } else {
                        reject({ message: 'Downloaded file not found', stderr: stderrStr });
                    }
                } else {
                    reject({ message: 'Download process failed', stderr: stderrStr });
                }
            });
            process.on('error', (err: any) => reject({ message: err.message, stderr: stderrStr }));
        });
    }
}
