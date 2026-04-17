import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDB } from './db/connection';

const PORT = config.port;

const startServer = async () => {
  // Connect to DB first
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`🌱 AgriVision API running on http://localhost:${PORT}`);
    logger.info(`📋 Health check: http://localhost:${PORT}/api/health`);
    logger.info(`🔧 Environment: ${config.nodeEnv}`);
    logger.info(`🤖 Mock ML: ${config.useMockML}`);
  });
};

startServer();
