import { Router } from 'express';
import analyzeRoutes from './analyze.routes';
import healthRoutes from './health.routes';
import cropsRoutes from './crops.routes';
import diseasesRoutes from './diseases.routes';
import authRoutes from './auth.routes';
import livekitRoutes from './livekit.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/analyze', analyzeRoutes);
routes.use('/health', healthRoutes);
routes.use('/crops', cropsRoutes);
routes.use('/diseases', diseasesRoutes);
routes.use('/livekit', livekitRoutes);
