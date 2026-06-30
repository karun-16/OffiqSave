import { Request, Response } from 'express';
import { DownloaderService } from '../services/downloaderService';
import { cleanupFile } from '../utils/cleanup';
import fs from 'fs';
import path from 'path';

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
        if (targetFormat !== 'mp4') {
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
