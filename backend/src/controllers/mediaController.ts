import { Request, Response } from 'express';
import { DownloaderService } from '../services/downloaderService';
import { cleanupFile } from '../utils/cleanup';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { instagramReelExtractor } from '../extractors/instagram/InstagramReelExtractor';
import { ExtractorCache } from '../common/Cache';
import NodeCache from 'node-cache';
import { v4 as uuidv4 } from 'uuid';

const downloadTokenCache = new NodeCache({ stdTTL: 300 }); // 5 minutes short-lived token cache

// ─── /api/info ───────────────────────────────────────────────────────────────

export const info = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[mediaController.ts] Controller entry: info()');
        console.log('[mediaController.ts] Before validation');
        const url = req.body?.url;
        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Valid URL string is required' });
            return;
        }
        console.log('[mediaController.ts] After validation, URL:', url);

        console.log('[mediaController.ts] Before DownloaderService.getMediaInfo()');
        const mediaInfo = await DownloaderService.getMediaInfo(url);
        res.json(mediaInfo);
    } catch (error: any) {
        console.error('[mediaController.ts] Info Error inside catch block:', error);
        console.error(error.stack);
        res.status(500).json({ error: error.message || 'Failed to fetch media' });
    }
};

// ─── /api/download/prepare ───────────────────────────────────────────────────

export const prepareDownload = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, formatId, selectedFormat, targetFormat, videoUrl, title } = req.body || {};

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Valid URL string is required' });
            return;
        }

        const downloadId = uuidv4();
        downloadTokenCache.set(downloadId, {
            url,
            formatId,
            selectedFormat,
            targetFormat,
            videoUrl,
            title
        });

        console.log(`[download/prepare] Issued downloadId: ${downloadId} for url: ${url}`);
        res.json({ downloadId });
    } catch (error: any) {
        console.error('[prepareDownload Error]:', error);
        res.status(500).json({ error: error.message || 'Failed to prepare download' });
    }
};

// ─── /api/download/file/:downloadId ──────────────────────────────────────────

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
    const getReceivedTime = Date.now();
    const downloadId = String(req.params.downloadId);
    
    console.log(`\n===== NATIVE DOWNLOAD GET TRACE =====`);
    console.log(`GET received: ${new Date(getReceivedTime).toISOString()}`);
    console.log(`downloadId: ${downloadId}`);

    const payload: any = downloadTokenCache.get(downloadId);
    console.log(`Token lookup: token found: ${!!payload}`);

    if (!payload) {
        res.status(404).json({ error: 'Download request invalid or expired' });
        return;
    }

    // Single-use token: consume immediately
    downloadTokenCache.del(downloadId);
    console.log(`token consumed: true`);

    const { url, formatId, selectedFormat, targetFormat, videoUrl, title } = payload;
    console.log(`Stored request:`);
    console.log(`  url: ${url}`);
    console.log(`  formatId: ${formatId}`);
    console.log(`  selectedFormat: ${selectedFormat}`);
    console.log(`  targetFormat: ${targetFormat}`);

    let downloadedFilePath = '';
    let finalFilePath = '';
    let isCleanupDone = false;

    const doCleanup = () => {
        if (!isCleanupDone) {
            isCleanupDone = true;
            console.log(`[CLEANUP] timestamp: ${new Date().toISOString()}`);
            if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
                cleanupFile(downloadedFilePath);
                console.log(`[CLEANUP] Deleted source: ${downloadedFilePath}`);
            }
            if (finalFilePath && finalFilePath !== downloadedFilePath && fs.existsSync(finalFilePath)) {
                cleanupFile(finalFilePath);
                console.log(`[CLEANUP] Deleted converted: ${finalFilePath}`);
            }
        }
    };

    res.on('finish', () => {
        console.log(`Response event 'finish': ${new Date().toISOString()}`);
        doCleanup();
    });
    res.on('close', () => {
        console.log(`Response event 'close': ${new Date().toISOString()}`);
        doCleanup();
    });

    try {
        const supportedAudioFormats = ['mp3', 'wav', 'aac', 'm4a'];
        const isAudio = selectedFormat === 'audio' ||
                        formatId === 'bestaudio/best' ||
                        (targetFormat && supportedAudioFormats.includes(targetFormat.toLowerCase()));

        const isInstagramReel = url.includes('instagram.com') && (
            url.includes('/reel/') || url.includes('/reels/') || url.includes('/tv/')
        );

        if (!isAudio && (videoUrl || isInstagramReel)) {
            let targetVideoUrl = videoUrl;
            let targetTitle = title || 'video';

            if (!targetVideoUrl && isInstagramReel) {
                const cachedInfo: any = ExtractorCache.getMetadata(url);
                if (cachedInfo && cachedInfo.formats && cachedInfo.formats[0]?.url) {
                    targetVideoUrl = cachedInfo.formats[0].url;
                    targetTitle = cachedInfo.title || targetTitle;
                } else {
                    const reelRes = await instagramReelExtractor.extract(url);
                    targetVideoUrl = reelRes.videoUrl;
                    targetTitle = reelRes.title || targetTitle;
                }
            }

            if (targetVideoUrl && !url.includes('youtube.com') && !url.includes('youtu.be')) {
                const fetchHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*'
                };
                const response = await fetch(targetVideoUrl, { headers: fetchHeaders, redirect: 'follow' });
                if (response.ok && response.body) {
                    const safeTitle = (targetTitle || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
                    res.setHeader('Content-Type', 'video/mp4');
                    const contentLength = response.headers.get('content-length');
                    if (contentLength) res.setHeader('Content-Length', contentLength);

                    const nodeStream = Readable.fromWeb(response.body as any);
                    nodeStream.pipe(res);
                    return;
                }
            }
        }

        const reqFormatId = formatId || (isAudio ? 'bestaudio/best' : 'best');

        const dlStart = Date.now();
        console.log(`yt-dlp download start timestamp: ${new Date(dlStart).toISOString()}`);

        downloadedFilePath = await DownloaderService.downloadMedia(url, reqFormatId);
        const dlFinish = Date.now();
        console.log(`yt-dlp download finish timestamp: ${new Date(dlFinish).toISOString()} (elapsed: ${dlFinish - dlStart} ms)`);

        finalFilePath = downloadedFilePath;

        if (isAudio && targetFormat && targetFormat !== 'mp4') {
            const currentExt = path.extname(downloadedFilePath).replace('.', '');
            if (currentExt !== targetFormat) {
                const ffStart = Date.now();
                console.log(`FFmpeg conversion start: ${new Date(ffStart).toISOString()}`);
                finalFilePath = await DownloaderService.convertMedia(downloadedFilePath, targetFormat);
                const ffFinish = Date.now();
                console.log(`FFmpeg conversion finish: ${new Date(ffFinish).toISOString()} (elapsed: ${ffFinish - ffStart} ms)`);
            }
        }

        const fileExists = fs.existsSync(finalFilePath);
        const stats = fileExists ? fs.statSync(finalFilePath) : null;
        console.log(`Generated file path: ${finalFilePath}`);
        console.log(`File exists: ${fileExists}, size: ${stats ? stats.size : 0} bytes`);

        if (!fileExists || !stats || stats.size === 0) {
            throw new Error('Processed media file not found or empty.');
        }

        const safeTitle = (title || 'media').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const ext = path.extname(finalFilePath).replace('.', '') || (isAudio ? 'mp3' : 'mp4');
        const fileName = `${safeTitle}.${ext}`;

        const preResDownloadTime = Date.now();
        console.log(`Immediately before res.download() timestamp: ${new Date(preResDownloadTime).toISOString()}`);
        console.log(`TIME TO FIRST RESPONSE HEADER/BYTE: ${preResDownloadTime - getReceivedTime} ms`);

        res.download(finalFilePath, fileName, (err) => {
            const cbTime = Date.now();
            console.log(`res.download callback timestamp: ${new Date(cbTime).toISOString()}`);
            if (err) {
                console.error('[downloadFile] res.download callback error:', err);
            }
            doCleanup();
        });
    } catch (error: any) {
        console.error('[downloadFile Exception]:', error.stack || error);
        doCleanup();
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Failed to download media' });
        }
    }
};

// ─── /api/download ───────────────────────────────────────────────────────────

export const download = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("[EXPRESS TRACE] 3. Controller entered: mediaController.download");
        console.log("[TRACE VIDEO] 1. Incoming request body:", req.body);

        const url = req.body?.url;
        const formatId = req.body?.formatId;
        const videoUrl = req.body?.videoUrl;
        const title = req.body?.title;

        if (!url || typeof url !== 'string') {
            console.log("[EXPRESS TRACE] 6. HTTP status returned: 400 Bad Request");
            res.status(400).json({ error: 'Valid URL string is required' });
            return;
        }

        const isInstagramReel = url.includes('instagram.com') && (
            url.includes('/reel/') || url.includes('/reels/') || url.includes('/tv/')
        );

        if (videoUrl || isInstagramReel) {
            let targetVideoUrl = videoUrl;
            let targetTitle = title || 'video';

            if (!targetVideoUrl && isInstagramReel) {
                const cachedInfo: any = ExtractorCache.getMetadata(url);
                if (cachedInfo && cachedInfo.formats && cachedInfo.formats[0]?.url) {
                    targetVideoUrl = cachedInfo.formats[0].url;
                    targetTitle = cachedInfo.title || targetTitle;
                } else {
                    const reelRes = await instagramReelExtractor.extract(url);
                    targetVideoUrl = reelRes.videoUrl;
                    targetTitle = reelRes.title || targetTitle;
                }
            }

            if (targetVideoUrl && !url.includes('youtube.com') && !url.includes('youtu.be')) {
                console.log("[TRACE VIDEO] 2. Selected format URL:", targetVideoUrl);
                console.log("[TRACE VIDEO] 3. Start downloading MP4 via CDN pipe");

                const fetchHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Accept': '*/*'
                };

                const response = await fetch(targetVideoUrl, { headers: fetchHeaders, redirect: 'follow' });
                if (!response.ok || !response.body) {
                    throw new Error(`HTTP ${response.status} when fetching direct video CDN`);
                }

                console.log("[TRACE VIDEO] 4. MP4 download/fetch headers received");

                const safeTitle = (targetTitle || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
                res.setHeader('Content-Type', 'video/mp4');

                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    res.setHeader('Content-Length', contentLength);
                }

                console.log("[EXPRESS TRACE] 5. Exact line sending response: nodeStream.pipe(res) (mediaController.ts:98)");
                const nodeStream = Readable.fromWeb(response.body as any);
                nodeStream.pipe(res);

                console.log("[EXPRESS TRACE] 6. HTTP status returned: 200 OK (Stream piping)");

                nodeStream.on('error', (err: any) => {
                    console.error('[EXPRESS TRACE] 7. Thrown exception in stream:', err.stack || err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Failed to stream video' });
                    }
                });
                return;
            }
        }

        console.log("[TRACE VIDEO] 3. Start downloading MP4 via local temp file");
        const downloadedFilePath = await DownloaderService.downloadMedia(url, formatId);
        console.log("[EXPRESS TRACE] 4. Downloader returns path:", downloadedFilePath);

        console.log("[EXPRESS TRACE] 5. Exact line sending response: res.download(downloadedFilePath) (mediaController.ts:117)");
        res.download(downloadedFilePath, (err) => {
            if (err) {
                console.error('[EXPRESS TRACE] 7. Thrown exception in res.download:', err.stack || err);
            } else {
                console.log("[EXPRESS TRACE] 6. HTTP status returned: 200 OK");
            }
            cleanupFile(downloadedFilePath);
        });
    } catch (error: any) {
        console.error('[EXPRESS TRACE] 7. Thrown exception (Full Stack Trace):', error.stack || error);
        res.status(500).json({ error: 'Failed to download media' });
    }
};

// ─── /api/download-image ─────────────────────────────────────────────────────

export const downloadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageUrl, filename, sourceUrl } = req.body;
        if (!imageUrl) {
            res.status(400).json({ error: 'imageUrl is required' });
            return;
        }

        const filePath = await DownloaderService.downloadImageDirect(imageUrl);

        const ext = path.extname(filePath).replace('.', '') || 'jpg';
        const safeFilename = filename || `image.${ext}`;

        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('end', () => cleanupFile(filePath));
        stream.on('error', (err) => {
            console.error('[Controller] Image stream error:', err.stack || err);
            cleanupFile(filePath);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream image' });
            }
        });
    } catch (error: any) {
        console.error('[Controller] Download-image error:', error.stack || error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Failed to download image' });
        }
    }
};

// ─── /api/convert ────────────────────────────────────────────────────────────

export const convert = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("[TRACE AUDIO] 1. Incoming request:", req.body);

        const url = req.body?.url;
        const formatId = req.body?.formatId;
        const targetFormat = req.body?.targetFormat;
        if (!url || typeof url !== 'string' || !formatId || !targetFormat) {
            res.status(400).json({ error: 'Valid URL string, formatId, and targetFormat are required' });
            return;
        }

        const downloadedFilePath = await DownloaderService.downloadMedia(url, formatId);
        console.log("[TRACE AUDIO] 3. MP4 download finished:", downloadedFilePath);

        let finalFilePath = downloadedFilePath;
        const currentExt = path.extname(downloadedFilePath).replace('.', '');

        if (targetFormat !== 'mp4' && currentExt !== targetFormat) {
            console.log("[TRACE AUDIO] 4. FFmpeg started");
            finalFilePath = await DownloaderService.convertMedia(downloadedFilePath, targetFormat);
            console.log("[TRACE AUDIO] 5. FFmpeg finished:", finalFilePath);
            cleanupFile(downloadedFilePath);
        }

        const mp3Exists = fs.existsSync(finalFilePath);
        console.log("[TRACE AUDIO] 6. MP3 exists?", mp3Exists);

        res.download(finalFilePath, (err) => {
            if (err) {
                console.error('[TRACE AUDIO STREAM ERROR]', err.stack || err);
            } else {
                console.log("[TRACE AUDIO] 7. Response sent");
            }
            cleanupFile(finalFilePath);
        });

    } catch (error: any) {
        console.error('[TRACE AUDIO EXCEPTION] Full stack trace:', error.stack || error);
        res.status(500).json({ error: error.message || 'Failed to convert media' });
    }
};

// ─── /api/download-zip ───────────────────────────────────────────────────────

export const downloadZip = async (req: Request, res: Response): Promise<void> => {
    try {
        const { images, sourceUrl } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            res.status(400).json({ error: 'Array of images is required' });
            return;
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="gallery.zip"');

        const { ZipArchive } = require('archiver');
        const archive = new ZipArchive({ zlib: { level: 6 } });
        
        archive.on('error', (err: any) => {
            throw err;
        });

        archive.pipe(res);

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            try {
                const filePath = await DownloaderService.downloadImageDirect(img.url);
                const ext = path.extname(filePath).replace('.', '') || img.format || 'jpg';
                const name = img.filename || `image-${i + 1}.${ext}`;
                const buffer = fs.readFileSync(filePath);
                archive.append(buffer, { name });
                cleanupFile(filePath);
            } catch (err) {
                console.error(`[Controller] Failed to fetch image ${i + 1} for ZIP: ${img.url}`, err);
            }
        }

        await archive.finalize();
    } catch (error: any) {
        console.error('[Controller] Zip error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate zip' });
        }
    }
};
