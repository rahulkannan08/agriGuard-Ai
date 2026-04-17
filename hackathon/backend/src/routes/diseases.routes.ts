import { Router } from 'express';
import { diseasesController, diseaseByIdController } from '../controllers/diseases.controller';

const router = Router();

// GET /api/diseases — list all diseases
router.get('/', diseasesController);

// GET /api/diseases/:id — get specific disease info
router.get('/:id', diseaseByIdController);

export default router;
