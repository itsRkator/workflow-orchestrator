import { App } from './App';
import { Logger } from './utils/logger';

const logger = new Logger();
const port = Number.parseInt(process.env.PORT || '3000');

// Create logs directory if it doesn't exist
import * as fs from 'node:fs';

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Create outputs directory if it doesn't exist
if (!fs.existsSync('outputs')) {
  fs.mkdirSync('outputs');
}

// Create reports directory if it doesn't exist
if (!fs.existsSync('reports')) {
  fs.mkdirSync('reports');
}

try {
  const app = new App(port);
  app.start();
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error(`Failed to start application: ${error.message}`);
  } else {
    logger.error(`Failed to start application: Unknown error`);
  }
  process.exit(1);
}
