import app from './app.js';
import config from './config.js';
import { migrateToLatest } from './db/migrate.js';

async function startServer() {
  try {
    if (config.NODE_ENV === 'development') {
      await migrateToLatest();
      console.log('Database migrations completed');
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
