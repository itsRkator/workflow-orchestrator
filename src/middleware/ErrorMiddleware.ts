import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

export class ErrorMiddleware {
  private static readonly logger = new Logger();

  static handle(error: Error, req: Request, res: Response, _next: NextFunction): void {
    ErrorMiddleware.logger.error(`Unhandled error: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack })
      }
    });
  }
}
