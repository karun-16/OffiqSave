import fs from 'fs';
import path from 'path';

export const cleanupFile = (filePath: string) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] Removed file: ${filePath}`);
        }
    } catch (err) {
        console.error(`[Cleanup] Failed to remove file: ${filePath}`, err);
    }
};

export const ensureDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};
