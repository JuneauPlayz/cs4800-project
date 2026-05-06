import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import './config/env.js';
import apiRouter from './routes/api.js';
import { getReceiptUploadRoot } from './services/receiptService.js';

const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '20mb';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(morgan('dev'));
  app.use(
    '/receipts',
    express.static(getReceiptUploadRoot(), { immutable: true, maxAge: '30d' })
  );

  app.use('/api', apiRouter);

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({
        message: 'Receipt image is too large. Try a smaller image or retake the receipt photo.'
      });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ message: 'Invalid JSON payload.' });
    }
    console.error(err);
    res.status(500).json({ message: err?.message || 'Server error.' });
  });

  return app;
}
