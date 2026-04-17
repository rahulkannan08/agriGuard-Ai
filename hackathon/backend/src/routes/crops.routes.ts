import { Router } from 'express';
import { cropsController } from '../controllers/crops.controller';

const router = Router();

router.get('/', cropsController);

export default router;
