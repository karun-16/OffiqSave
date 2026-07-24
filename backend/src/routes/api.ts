import { Router } from 'express';
import { info, download, downloadImage, convert, downloadZip, prepareDownload, downloadFile } from '../controllers/mediaController';

const router = Router();

router.post('/info', (req, res, next) => {
    console.log('[api.ts] Route entry: POST /info');
    next();
}, info);

router.post('/download/prepare', prepareDownload);
router.get('/download/file/:downloadId', downloadFile);

router.post('/download', (req, res, next) => {
    console.log('\n========================================');
    console.log('[EXPRESS TRACE] 1. Incoming POST /api/download');
    console.log('[EXPRESS TRACE] 2. Middleware executed: [helmet, compression, cors, express.json]');
    next();
}, download);

router.post('/download-image', downloadImage);
router.post('/convert', convert);
router.post('/download-zip', downloadZip);

export default router;
