import { Router } from 'express';
import { info, download, convert } from '../controllers/mediaController';

const router = Router();

router.post('/info', info);
router.post('/download', download);
router.post('/convert', convert);

export default router;
