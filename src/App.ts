import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from './utils/logger';
import { WorkflowController } from './controllers/WorkflowController';
import { ErrorMiddleware } from './middleware/ErrorMiddleware';

export class App {
  private app: express.Application;
  private logger: Logger;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.logger = new Logger();
    this.port = port;
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors());
    
    // Compression middleware
    this.app.use(compression());
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging middleware
    this.app.use((req, _res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  private initializeRoutes(): void {
    const workflowController = new WorkflowController();
    
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });
    
    // API routes
    this.app.use('/api/workflows', workflowController.getRouter());
    
    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        message: 'Workflow Orchestrator API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          workflows: '/api/workflows'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        }
      });
    });
    
    // Global error handler
    this.app.use(ErrorMiddleware.handle);
  }

  public start(): void {
    this.app.listen(this.port, () => {
      this.logger.info(`Workflow Orchestrator server started on port ${this.port}`);
      this.logger.info(`Health check available at: http://localhost:${this.port}/health`);
      this.logger.info(`API documentation available at: http://localhost:${this.port}/`);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}
