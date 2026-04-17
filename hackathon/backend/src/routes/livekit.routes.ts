import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
	createLiveKitTokenController,
	synthesizeLiveKitVoiceController,
} from '../controllers/livekit.controller';

const router = Router();

// POST /api/livekit/token — create a room token for authenticated user
router.post('/token', protect, createLiveKitTokenController);

// POST /api/livekit/tts — synthesize multilingual voice (ElevenLabs)
router.post('/tts', protect, synthesizeLiveKitVoiceController);

export default router;
