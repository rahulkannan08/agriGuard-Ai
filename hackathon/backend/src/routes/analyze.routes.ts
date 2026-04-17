import { Router } from 'express';
import multer from 'multer';
import {
  analyzeController,
  analyzeWithUploadController,
  getAnalysisHistoryController,
  analyzeChatController,
  getDiseaseHeatmapController,
} from '../controllers/analyze.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/analyze — accepts JSON body with base64 image
router.post('/', analyzeController);

// GET /api/analyze/history — returns authenticated user's analysis history
router.get('/history', protect, getAnalysisHistoryController);

// GET /api/analyze/heatmap — returns region hotspots for disease spread visualization
router.get('/heatmap', protect, getDiseaseHeatmapController);

// POST /api/analyze/chat — asks follow-up questions for current analysis result
router.post('/chat', protect, analyzeChatController);

// POST /api/analyze/upload — accepts multipart/form-data file upload
router.post('/upload', protect, upload.single('image'), analyzeWithUploadController);

export default router;
