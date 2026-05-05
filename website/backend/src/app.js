import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import './config/env.js';
import apiRouter from './routes/api.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  app.use('/api', apiRouter);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: err?.message || 'Server error.' });
  });

  return app;
}
