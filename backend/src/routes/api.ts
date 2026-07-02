import { Router } from 'express';
import { info, download, downloadImage, convert, downloadZip } from '../controllers/mediaController';

const router = Router();

router.post('/info', (req, res, next) => {
    console.log('[api.ts] Route entry: POST /info');
    next();
}, info);
router.post('/download', download);
router.post('/download-image', downloadImage);
router.post('/convert', convert);
router.post('/download-zip', downloadZip);

export default router;
