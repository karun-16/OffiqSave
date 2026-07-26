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
    const url = req.body?.url;
    try {
        console.log('[mediaController.ts] Controller entry: info()');
        console.log('[mediaController.ts] Before validation');
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
        const isYouTube = typeof url === 'string' && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com'));
        const publicMessage = isYouTube
            ? 'Unable to access this YouTube media right now. Please try again later.'
            : (error.message || 'Failed to fetch media');
        res.status(500).json({ error: publicMessage });
    }
};

import { jobManager } from '../services/jobManager';

async function processDownloadJobAsync(downloadId: string): Promise<void> {
    const startMs = Date.now();
    console.log(`[DOWNLOAD JOB] Preparation started for downloadId: ${downloadId}`);
    const job = jobManager.getJob(downloadId);
    if (!job) return;

    try {
        const { url, formatId, selectedFormat, targetFormat, videoUrl, title } = job;
        const supportedAudioFormats = ['mp3', 'wav', 'aac', 'm4a'];
        const isAudio = selectedFormat === 'audio' ||
                        formatId === 'bestaudio/best' ||
                        (targetFormat && supportedAudioFormats.includes(targetFormat.toLowerCase()));

        const isInstagramReel = url.includes('instagram.com') && (
            url.includes('/reel/') || url.includes('/reels/') || url.includes('/tv/')
        );

        let downloadedFilePath = '';
        let finalFilePath = '';

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
                    const tmpDir = path.join(process.cwd(), 'tmp');
                    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                    finalFilePath = path.join(tmpDir, `${uuidv4()}_${safeTitle}.mp4`);
                    const arrayBuf = await response.arrayBuffer();
                    fs.writeFileSync(finalFilePath, Buffer.from(arrayBuf));

                    const stats = fs.statSync(finalFilePath);
                    const prepDuration = Date.now() - startMs;
                    console.log(`[DOWNLOAD JOB] Preparation completed in ${prepDuration} ms`);
                    console.log(`[DOWNLOAD JOB] Status: ready`);
                    console.log(`[DOWNLOAD JOB] File size: ${stats.size} bytes`);
                    jobManager.updateJobStatus(downloadId, {
                        status: 'ready',
                        filePath: finalFilePath,
                        fileName: `${safeTitle}.mp4`,
                        fileSize: stats.size
                    });
                    return;
                }
            }
        }

        const reqFormatId = formatId || (isAudio ? 'bestaudio/best' : 'best');
        downloadedFilePath = await DownloaderService.downloadMedia(url, reqFormatId);
        finalFilePath = downloadedFilePath;

        if (isAudio && targetFormat && targetFormat !== 'mp4') {
            const currentExt = path.extname(downloadedFilePath).replace('.', '');
            if (currentExt !== targetFormat) {
                finalFilePath = await DownloaderService.convertMedia(downloadedFilePath, targetFormat);
                if (downloadedFilePath !== finalFilePath && fs.existsSync(downloadedFilePath)) {
                    cleanupFile(downloadedFilePath);
                }
            }
        }

        const fileExists = fs.existsSync(finalFilePath);
        const stats = fileExists ? fs.statSync(finalFilePath) : null;

        if (!fileExists || !stats || stats.size === 0) {
            throw new Error('Processed media file not found or empty.');
        }

        const safeTitle = (title || 'media').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const ext = path.extname(finalFilePath).replace('.', '') || (isAudio ? 'mp3' : 'mp4');
        const fileName = `${safeTitle}.${ext}`;

        const prepDuration = Date.now() - startMs;
        console.log(`[DOWNLOAD JOB] Preparation completed in ${prepDuration} ms`);
        console.log(`[DOWNLOAD JOB] Status: ready`);
        console.log(`[DOWNLOAD JOB] File size: ${stats.size} bytes`);

        jobManager.updateJobStatus(downloadId, {
            status: 'ready',
            filePath: finalFilePath,
            fileName,
            fileSize: stats.size
        });
    } catch (err: any) {
        const isYouTube = typeof job.url === 'string' && (job.url.includes('youtube.com') || job.url.includes('youtu.be') || job.url.includes('youtube-nocookie.com'));
        const publicMessage = isYouTube
            ? 'Unable to access this YouTube media right now. Please try again later.'
            : (err?.message || 'Failed to prepare media for download.');
        console.error(`[DOWNLOAD JOB ERROR] Stage: PREPARATION | Category: ${isYouTube ? 'YOUTUBE_FAILURE' : 'GENERIC_FAILURE'}`);
        console.error(`[DOWNLOAD JOB ERROR] Message: ${err?.message || err}`);
        jobManager.updateJobStatus(downloadId, {
            status: 'failed',
            error: publicMessage
        });
    }
}

// ─── /api/download/prepare ───────────────────────────────────────────────────

export const prepareDownload = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, formatId, selectedFormat, targetFormat, videoUrl, title } = req.body || {};

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Valid URL string is required' });
            return;
        }

        const downloadId = uuidv4();
        jobManager.createJob(downloadId, {
            url,
            formatId,
            selectedFormat,
            targetFormat,
            videoUrl,
            title
        });

        console.log(`[DOWNLOAD JOB] Created: ${downloadId} for url: ${url}`);
        res.json({ downloadId, status: 'processing' });

        // Launch background download preparation asynchronously
        processDownloadJobAsync(downloadId).catch((err) => {
            console.error(`[DOWNLOAD JOB Unhandled Error] downloadId: ${downloadId}`, err);
        });
    } catch (error: any) {
        console.error('[prepareDownload Error]:', error);
        res.status(500).json({ error: error.message || 'Failed to prepare download' });
    }
};

// ─── /api/download/status/:downloadId ────────────────────────────────────────

export const getDownloadStatus = async (req: Request, res: Response): Promise<void> => {
    const downloadId = String(req.params.downloadId);
    const job = jobManager.getJob(downloadId);

    if (!job) {
        res.status(404).json({ error: 'Download request invalid or expired' });
        return;
    }

    if (job.status === 'processing') {
        res.json({ status: 'processing' });
        return;
    }

    if (job.status === 'ready') {
        res.json({ status: 'ready' });
        return;
    }

    if (job.status === 'failed') {
        res.json({ status: 'failed', error: job.error || 'Unable to prepare this media for download.' });
        return;
    }
};

// ─── /api/download/file/:downloadId ──────────────────────────────────────────

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
    const getReceivedTime = Date.now();
    const downloadId = String(req.params.downloadId);

    const job = jobManager.getJob(downloadId);

    if (!job) {
        res.status(404).json({ error: 'Download request invalid or expired' });
        return;
    }

    if (job.status === 'processing') {
        res.status(425).json({ error: 'Media preparation is still in progress.' });
        return;
    }

    if (job.status === 'failed') {
        res.status(500).json({ error: job.error || 'Unable to prepare this media for download.' });
        return;
    }

    if (job.status !== 'ready' || !job.filePath || !fs.existsSync(job.filePath)) {
        res.status(404).json({ error: 'Prepared file not found or expired.' });
        return;
    }

    console.log(`\n===== NATIVE DOWNLOAD GET TRACE =====`);
    console.log(`[DOWNLOAD JOB] File request received`);
    console.log(`[DOWNLOAD JOB] Status: ready`);
    const timeToResDownload = Date.now() - getReceivedTime;
    console.log(`[DOWNLOAD JOB] Time from GET request to res.download(): ${timeToResDownload} ms`);

    const filePath = job.filePath;
    const fileName = job.fileName || 'media.mp4';

    let isCleanupDone = false;
    const doCleanup = () => {
        if (!isCleanupDone) {
            isCleanupDone = true;
            console.log(`[DOWNLOAD JOB] Transfer finished`);
            jobManager.cleanupJob(downloadId);
        }
    };

    res.on('finish', () => {
        doCleanup();
    });
    res.on('close', () => {
        doCleanup();
    });

    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error('[DOWNLOAD JOB Error] res.download callback error:', err);
        }
        doCleanup();
    });
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
