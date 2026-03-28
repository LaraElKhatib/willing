import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import morgan from 'morgan';
import { ZodError } from 'zod';

import api from './api/index.ts';
import config from './config.ts';

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use(cors({
  origin: config.NODE_ENV === 'development'
    ? [
        config.CLIENT_URL,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ]
    : config.CLIENT_URL,
  credentials: true,
}));

app.use(api);

app.use((req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
});

app.use(((err, _req, res, _next) => {
  if (res.statusCode === 200) {
    if (err instanceof ZodError) {
      res.status(400);
    } else {
      res.status(500);
    }
  }

  res.json({
    message: err.message,
    stack: config.NODE_ENV === 'production' ? '' : err.stack,
  });
}) as ErrorRequestHandler);

export default app;
