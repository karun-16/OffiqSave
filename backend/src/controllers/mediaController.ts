import { Request, Response } from 'express';
import { DownloaderService } from '../services/downloaderService';
import { cleanupFile } from '../utils/cleanup';
import fs from 'fs';
import path from 'path';
const archiver = require('archiver');

export const info = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url } = req.body;
        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }

        const mediaInfo = await DownloaderService.getMediaInfo(url);
        res.json(mediaInfo);
    } catch (error: any) {
        console.error('Info Error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch media' });
    }
};

export const download = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, formatId } = req.body;
        if (!url || !formatId) {
            res.status(400).json({ error: 'URL and formatId are required' });
            return;
        }

        const downloadedFilePath = await DownloaderService.downloadMedia(url, formatId);

        // Stream file to client and cleanup
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

export const convert = async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, formatId, targetFormat } = req.body;
        if (!url || !formatId || !targetFormat) {
            res.status(400).json({ error: 'URL, formatId, and targetFormat are required' });
            return;
        }

        const downloadedFilePath = await DownloaderService.downloadMedia(url, formatId);
        
        let finalFilePath = downloadedFilePath;
        const currentExt = path.extname(downloadedFilePath).replace('.', '');
        
        if (targetFormat !== 'mp4' && currentExt !== targetFormat) {
            finalFilePath = await DownloaderService.convertMedia(downloadedFilePath, targetFormat);
            cleanupFile(downloadedFilePath);
        }

        // 3. Stream converted file to client and cleanup
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

export const downloadZip = async (req: Request, res: Response): Promise<void> => {
    try {
        const { images } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            res.status(400).json({ error: 'Array of images is required' });
            return;
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="gallery.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err: any) => {
            throw err;
        });

        archive.pipe(res);

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            try {
                const response = await fetch(img.url);
                if (response.ok && response.body) {
                    const ext = img.format || 'jpg';
                    const name = img.filename || `image-${i + 1}.${ext}`;
                    
                    // We need to fetch it as ArrayBuffer to append to archiver
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    
                    archive.append(buffer, { name });
                }
            } catch (err) {
                console.error(`Failed to fetch image ${img.url}`, err);
            }
        }

        archive.finalize();
    } catch (error: any) {
        console.error('[Controller] Zip error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate zip' });
        }
    }
};
