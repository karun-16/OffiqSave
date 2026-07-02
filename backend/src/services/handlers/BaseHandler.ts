import ytDlp, { exec } from 'yt-dlp-exec';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ensureDir } from '../../utils/cleanup';
import { MediaInfo } from '../downloaderService';
import NodeCache from 'node-cache';
import { ExtractionRouter } from '../ExtractionRouter';
import { ExtractionResult } from '../types';

export const metaCache = new NodeCache({ stdTTL: 600 });

const TMP_DIR = path.join(process.cwd(), 'tmp');
const COOKIES_FILE = path.join(process.cwd(), 'cookies.txt');
const BROWSERS = ['chrome', 'edge', 'brave', 'firefox', 'opera'];

let ytDlpVersion = 'Unknown';
exec('--version').then((res: any) => {
    if (res && res.stdout) ytDlpVersion = res.stdout.trim();
}).catch(() => {});

export function pipelineLog(platform: string, urlType: string, classifierRes: string, extractor: string, nativeSuccess: string, ytdlpUsed: string, downloadMethod: string, timeMs: number, result: string) {
    console.log(`\n==============================`);
    console.log(`Platform: ${platform}`);
    console.log(`URL Type: ${urlType}`);
    console.log(`Classifier: ${classifierRes}`);
    console.log(`Extractor: ${extractor}`);
    console.log(`Native Success: ${nativeSuccess}`);
    console.log(`yt-dlp Used: ${ytdlpUsed}`);
    console.log(`Download Method: ${downloadMethod}`);
    console.log(`Execution Time: ${timeMs}ms`);
    console.log(`Result: ${result}`);
    console.log(`==============================\n`);
}

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

        const cached = metaCache.get<MediaInfo>(url);
        if (cached) {
            this.log(`[Profiler] Metadata Cache Hit: ${(performance.now() - startTime).toFixed(0)}ms`);
            return cached;
        }

        this.log(`Platform detected: ${this.platformName}`);

        // Route through new extraction pipeline
        const extractionResult: ExtractionResult = await ExtractionRouter.route(url, this);

        // Convert ExtractionResult -> MediaInfo
        const info: MediaInfo = {
            title: extractionResult.title || 'Unknown Title',
            thumbnail: extractionResult.thumbnail || '',
            duration: extractionResult.duration || 0,
            platform: this.platformName,
            uploader: extractionResult.author || undefined,
            formats: extractionResult.formats || [],
            mediaType: extractionResult.mediaType.toLowerCase() as any,
            images: extractionResult.images
        };

        metaCache.set(url, info);
        return info;
    }

    async extractWithYtDlp(url: string): Promise<ExtractionResult> {
        const startTime = performance.now();
        const baseOptions = {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            noPlaylist: true,
            skipDownload: true,
            ...this.getExtraOptions(),
        };

        let retryCount = 1;
        const tryExtract = async (opts: any, label: string) => {
            try {
                const info = await this.extract(url, opts);
                return info;
            } catch (e: any) {
                return null;
            }
        };

        let info = await tryExtract(baseOptions, 'Normal');
        if (info) return this.mapYtDlpToExtractionResult(info);

        info = await tryExtract({
            ...baseOptions,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }, 'User-Agent');
        if (info) return this.mapYtDlpToExtractionResult(info);

        const cookiesExist = fs.existsSync(COOKIES_FILE);
        if (cookiesExist) {
            info = await tryExtract({ ...baseOptions, cookies: COOKIES_FILE }, 'cookies.txt');
            if (info) return this.mapYtDlpToExtractionResult(info);
        }

        for (const browser of BROWSERS) {
            info = await tryExtract({ ...baseOptions, cookiesFromBrowser: browser }, browser);
            if (info) return this.mapYtDlpToExtractionResult(info);
        }

        throw new Error("This media couldn't be accessed. It may require authentication, be private, or the platform has temporarily restricted access.");
    }

    private mapYtDlpToExtractionResult(info: MediaInfo): ExtractionResult {
        return {
            mediaType: info.mediaType === 'image' ? 'IMAGE' : info.mediaType === 'gallery' ? 'GALLERY' : 'VIDEO',
            title: info.title,
            author: info.uploader || '',
            thumbnail: info.thumbnail,
            images: info.images,
            formats: info.formats,
            duration: info.duration,
            source: 'yt-dlp'
        };
    }

    async download(rawUrl: string, formatId: string): Promise<string> {
        const url = this.normalizeUrl(rawUrl);
        ensureDir(TMP_DIR);

        if (formatId === 'image' || formatId === 'original') {
            return this.downloadImageDirect(url);
        }

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
            this.log(`Download Success: ${(performance.now() - startTime).toFixed(0)}ms`);
            return res;
        } catch (e: any) {
            this.error(`Download failed. stderr:\n`, e.stderr || e.message);
            for (const browser of BROWSERS) {
                this.log(`Retrying download with browser cookies: ${browser}`);
                try {
                    const res = await this.executeDownload(url, { ...baseOptions, cookiesFromBrowser: browser }, fileId);
                    this.log(`Download Success with ${browser}: ${(performance.now() - startTime).toFixed(0)}ms`);
                    return res;
                } catch (err: any) {}
            }
            if (fs.existsSync(COOKIES_FILE)) {
                try {
                    const res = await this.executeDownload(url, { ...baseOptions, cookies: COOKIES_FILE }, fileId);
                    return res;
                } catch (err: any) {}
            }
            throw new Error("This media couldn't be downloaded due to platform restrictions.");
        }
    }

    async downloadImageDirect(imageUrl: string): Promise<string> {
        ensureDir(TMP_DIR);
        const fileId = uuidv4();

        let ext = imageUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?.*)?$/)?.[1]?.toLowerCase() || '';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        try {
            const response = await fetch(imageUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Referer': new URL(imageUrl).origin
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const contentType = response.headers.get('content-type') || '';
            if (!ext) {
                if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
                else if (contentType.includes('png')) ext = 'png';
                else if (contentType.includes('gif')) ext = 'gif';
                else if (contentType.includes('webp')) ext = 'webp';
                else if (contentType.includes('avif')) ext = 'avif';
                else if (contentType.includes('bmp')) ext = 'bmp';
                else if (contentType.includes('svg')) ext = 'svg';
                else ext = 'jpg';
            }

            const filePath = path.join(TMP_DIR, `${fileId}.${ext}`);
            const arrayBuffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

            this.log(`Image downloaded directly: ${filePath}`);
            return filePath;
        } finally {
            clearTimeout(timeout);
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
            
            if (images.length === 1) mediaType = 'image';
        } else if (output.vcodec === 'none' && output.acodec !== 'none') {
            mediaType = 'audio';
        } else if (
            (output.formats && !output.formats.some((f: any) => f.vcodec !== 'none' && f.vcodec !== 'mjpeg' && f.acodec !== 'none')) && 
            (output.ext && !['mp4', 'webm', 'mkv', 'm4a', 'mp3'].includes(output.ext.toLowerCase())) ||
            (output.ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'].includes(output.ext.toLowerCase()))
        ) {
            mediaType = 'image';
            const imgUrl = output.url || (output.thumbnails && output.thumbnails.length > 0 ? output.thumbnails[output.thumbnails.length - 1].url : '');
            if (imgUrl) {
                images = [{
                    id: output.id || 'img', url: imgUrl, width: output.width, height: output.height, format: output.ext || 'jpg'
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
            if (process.stderr) process.stderr.on('data', (data) => { stderrStr += data.toString(); });
            process.on('close', (code: number) => {
                if (code === 0) {
                    const files = fs.readdirSync(TMP_DIR);
                    const downloadedFile = files.find(f => f.startsWith(fileId) && !f.endsWith('.part'));
                    if (downloadedFile) resolve(path.join(TMP_DIR, downloadedFile));
                    else reject({ message: 'Downloaded file not found', stderr: stderrStr });
                } else {
                    reject({ message: 'Download process failed', stderr: stderrStr });
                }
            });
            process.on('error', (err: any) => reject({ message: err.message, stderr: stderrStr }));
        });
    }
}
