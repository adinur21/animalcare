import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createPool } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import animalRoutes from './routes/animalRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  try {
    const pool = createPool();
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'animalcare-api',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'animalcare-api',
      database: 'disconnected',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/animals', animalRoutes);
app.use('/api/dashboard', dashboardRoutes);

const staticDistPath = path.resolve(__dirname, '../../client/dist');
const staticIndexPath = path.join(staticDistPath, 'index.html');
const frontendBuildExists = fs.existsSync(staticDistPath) && fs.existsSync(staticIndexPath);

if (frontendBuildExists) {
  app.use(express.static(staticDistPath));
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    res.sendFile(staticIndexPath);
  });
} else {
  console.warn('Frontend build not found at client/dist. Run "npm run build" before running the app in production.');
  app.get(/^(?!\/api).*/, (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API route not found.' });
    }

    res.status(503).json({
      message: 'Frontend production build not found. Run "npm run build" in the project root and restart the app.'
    });
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AnimalCare API running on port ${PORT}`);
});
