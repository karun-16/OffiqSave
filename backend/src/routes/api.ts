import { Router } from 'express';
import { info, download, convert, downloadZip } from '../controllers/mediaController';

const router = Router();

router.post('/info', info);
router.post('/download', download);
router.post('/convert', convert);
router.post('/download-zip', downloadZip);

export default router;
