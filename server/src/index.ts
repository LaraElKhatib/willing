import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import morgan from 'morgan';
import { ZodError } from 'zod';

import api from './api/index.js';
import config from './config.js';
import { migrateToLatest } from './db/migrate.js';

const app = express();
const DEV_MIGRATION_RETRY_DELAY_MS = 2000;
const DEV_MIGRATION_MAX_ATTEMPTS = 10;

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

// Not found handler
app.use((req, res, next) => {
  res.status(404);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  next(error);
});

// Error handler
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

const sleep = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

async function runDevelopmentMigrationsWithRetry() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DEV_MIGRATION_MAX_ATTEMPTS; attempt += 1) {
    try {
      await migrateToLatest();
      console.log('Database migrations completed');
      return;
    } catch (error) {
      lastError = error;

      if (attempt === DEV_MIGRATION_MAX_ATTEMPTS) {
        break;
      }

      console.warn(
        `Migration attempt ${attempt}/${DEV_MIGRATION_MAX_ATTEMPTS} failed. Retrying in ${DEV_MIGRATION_RETRY_DELAY_MS}ms...`,
      );
      await sleep(DEV_MIGRATION_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function startServer() {
  try {
    if (config.NODE_ENV === 'development') {
      await runDevelopmentMigrationsWithRetry();
    }
  } catch (error) {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  }

  const server = app.listen(config.SERVER_PORT, () => {
    console.log('Listening on port ' + config.SERVER_PORT);
  });

  server.on('error', (error) => {
    console.error(`Failed to start server on port ${config.SERVER_PORT}:`, error.message);
    process.exit(1);
  });
}

startServer();
