import { Request, Response } from 'express';
import { DownloaderService } from '../services/downloaderService';
import { cleanupFile } from '../utils/cleanup';
import { HandlerFactory } from '../services/handlers/HandlerFactory';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { instagramReelExtractor } from '../extractors/instagram/InstagramReelExtractor';
import { metaCache } from '../services/handlers/BaseHandler';


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

// ─── /api/download ───────────────────────────────────────────────────────────

export const download = async (req: Request, res: Response): Promise<void> => {
    try {
        const url = req.body?.url;
        const formatId = req.body?.formatId;
        const videoUrl = req.body?.videoUrl;
        const title = req.body?.title;

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Valid URL string is required' });
            return;
        }

        const isInstagramReel = url.includes('instagram.com') && (
            url.includes('/reel/') || url.includes('/reels/') || url.includes('/tv/')
        );

        if (videoUrl || isInstagramReel) {
            let targetVideoUrl = videoUrl;
            let targetTitle = title || 'instagram_reel';

            if (!targetVideoUrl && isInstagramReel) {
                const cachedInfo: any = metaCache.get(url);
                if (cachedInfo && cachedInfo.formats && cachedInfo.formats[0]?.url) {
                    targetVideoUrl = cachedInfo.formats[0].url;
                    targetTitle = cachedInfo.title || targetTitle;
                } else {
                    const reelRes = await instagramReelExtractor.extract(url);
                    targetVideoUrl = reelRes.videoUrl;
                    targetTitle = reelRes.title || targetTitle;
                }
            }

            if (targetVideoUrl) {
                console.log(`[Native Reel Download] Using direct CDN URL`);
                const fetchHeaders = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Referer': 'https://www.instagram.com/'
                };

                const response = await fetch(targetVideoUrl, { headers: fetchHeaders, redirect: 'follow' });
                if (!response.ok || !response.body) {
                    throw new Error(`HTTP ${response.status} when fetching direct video CDN`);
                }

                const safeTitle = (targetTitle || 'instagram_reel').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
                res.setHeader('Content-Type', 'video/mp4');

                const contentLength = response.headers.get('content-length');
                if (contentLength) {
                    res.setHeader('Content-Length', contentLength);
                }

                const nodeStream = Readable.fromWeb(response.body as any);
                nodeStream.pipe(res);

                nodeStream.on('error', (err: any) => {
                    console.error('[Native Reel Download] Stream error:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Failed to stream video' });
                    }
                });
                return;
            }
        }

        const downloadedFilePath = await DownloaderService.downloadMedia(url, formatId);

        res.download(downloadedFilePath, (err) => {
            if (err) {
                console.error('[Controller] Download stream error:', err);
            }
            cleanupFile(downloadedFilePath);
        });
    } catch (error: any) {
        console.error('[Controller] Download error:', error);
        res.status(500).json({ error: 'Failed to download media' });
    }
};

// ─── /api/download-image ─────────────────────────────────────────────────────
// Downloads a single image via server-side fetch and streams it to the client.
// This avoids CORS issues when the frontend tries to fetch restricted image URLs.

export const downloadImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageUrl, filename, sourceUrl } = req.body;
        if (!imageUrl) {
            res.status(400).json({ error: 'imageUrl is required' });
            return;
        }

        // Use the handler's direct image downloader
        const handler = sourceUrl ? HandlerFactory.getHandler(sourceUrl) : HandlerFactory.getHandler(imageUrl);
        const filePath = await handler.downloadImageDirect(imageUrl);

        const ext = path.extname(filePath).replace('.', '') || 'jpg';
        const safeFilename = filename || `image.${ext}`;

        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`);

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('end', () => cleanupFile(filePath));
        stream.on('error', (err) => {
            console.error('[Controller] Image stream error:', err);
            cleanupFile(filePath);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream image' });
            }
        });
    } catch (error: any) {
        console.error('[Controller] Download-image error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Failed to download image' });
        }
    }
};

// ─── /api/convert ────────────────────────────────────────────────────────────

export const convert = async (req: Request, res: Response): Promise<void> => {
    try {
        const url = req.body?.url;
        const formatId = req.body?.formatId;
        const targetFormat = req.body?.targetFormat;
        if (!url || typeof url !== 'string' || !formatId || !targetFormat) {
            res.status(400).json({ error: 'Valid URL string, formatId, and targetFormat are required' });
            return;
        }

        const downloadedFilePath = await DownloaderService.downloadMedia(url, formatId);
        
        let finalFilePath = downloadedFilePath;
        const currentExt = path.extname(downloadedFilePath).replace('.', '');
        
        if (targetFormat !== 'mp4' && currentExt !== targetFormat) {
            finalFilePath = await DownloaderService.convertMedia(downloadedFilePath, targetFormat);
            cleanupFile(downloadedFilePath);
        }

        res.download(finalFilePath, (err) => {
            if (err) {
                console.error('[Controller] Conversion stream error:', err);
            }
            cleanupFile(finalFilePath);
        });

    } catch (error: any) {
        console.error('[Controller] Convert error:', error);
        res.status(500).json({ error: 'Failed to convert media' });
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

        const handler = sourceUrl ? HandlerFactory.getHandler(sourceUrl) : null;

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            try {
                if (handler) {
                    // Use server-side download to avoid CORS issues
                    const filePath = await handler.downloadImageDirect(img.url);
                    const ext = path.extname(filePath).replace('.', '') || img.format || 'jpg';
                    const name = img.filename || `image-${i + 1}.${ext}`;
                    const buffer = fs.readFileSync(filePath);
                    archive.append(buffer, { name });
                    cleanupFile(filePath);
                } else {
                    // Fallback: direct fetch
                    const response = await fetch(img.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    if (response.ok && response.body) {
                        const ext = img.format || 'jpg';
                        const name = img.filename || `image-${i + 1}.${ext}`;
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        archive.append(buffer, { name });
                    }
                }
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
