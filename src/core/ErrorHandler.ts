import { Logger } from '../utils/logger';
import { Step } from './Step';
import { WorkflowContext } from './WorkflowContext';
import { ErrorHandlingConfig, ExecutionError } from '../types';

export class ErrorHandler {
  private config: ErrorHandlingConfig;
  private logger: Logger;

  constructor(config: ErrorHandlingConfig) {
    this.config = config;
    this.logger = new Logger();
  }

  async handleError(error: Error, step: Step, context: WorkflowContext): Promise<void> {
    const errorInfo = this.classifyError(error);
    
    this.logger.error(`Handling error in step ${step.name}: ${error.message}`, {
      error: errorInfo,
      step: step.name,
      context: context.metadata,
    });

    if (this.shouldRetry(errorInfo)) {
      await this.executeRetry(error, step, context);
    } else {
      await this.executeFallback(errorInfo, step, context);
    }
  }

  private classifyError(error: Error): ErrorInfo {
    if (error instanceof ExecutionError) {
      return {
        type: 'EXECUTION',
        severity: 'MEDIUM',
        retryable: error.retryable,
        step: error.step,
      };
    } else if (error.message.includes('validation')) {
      return {
        type: 'VALIDATION',
        severity: 'HIGH',
        retryable: false,
        step: 'VALIDATION',
      };
    } else if (error.message.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        severity: 'MEDIUM',
        retryable: true,
        step: 'TIMEOUT',
      };
    } else if (error.message.includes('network')) {
      return {
        type: 'NETWORK',
        severity: 'MEDIUM',
        retryable: true,
        step: 'NETWORK',
      };
    } else {
      return {
        type: 'UNKNOWN',
        severity: 'HIGH',
        retryable: false,
        step: 'UNKNOWN',
      };
    }
  }

  private shouldRetry(errorInfo: ErrorInfo): boolean {
    return (
      errorInfo.retryable &&
      errorInfo.severity !== 'HIGH' &&
      this.config.maxRetries > 0
    );
  }

  private async executeRetry(error: Error, step: Step, context: WorkflowContext): Promise<void> {
    this.logger.info(`Retrying step ${step.name} due to error: ${error.message}`);
    
    const strategy = this.getRetryStrategy();
    let retryCount = 0;
    
    while (retryCount < this.config.maxRetries) {
      try {
        await strategy.delay(retryCount);
        await step.execute(context);
        this.logger.info(`Step ${step.name} succeeded on retry ${retryCount + 1}`);
        return;
      } catch (retryError) {
        retryCount++;
        const errorMessage = retryError instanceof Error ? retryError.message : 'Unknown error';
        this.logger.warn(`Retry ${retryCount} failed for step ${step.name}: ${errorMessage}`);
        
        if (retryCount >= this.config.maxRetries) {
          this.logger.error(`All retries exhausted for step ${step.name}`);
          throw retryError;
        }
      }
    }
  }

  private async executeFallback(errorInfo: ErrorInfo, step: Step, context: WorkflowContext): Promise<void> {
    this.logger.warn(`Executing fallback for step ${step.name}`, { errorInfo });
    
    // Implement fallback strategies based on error type
    switch (errorInfo.type) {
      case 'VALIDATION':
        // Use default values or skip validation
        context.data.set(`${step.name}_fallback`, true);
        break;
      case 'NETWORK':
        // Use cached data or mock data
        context.data.set(`${step.name}_fallback`, 'cached');
        break;
      default:
        // Log error and continue with next step
        this.logger.error(`No fallback strategy for error type: ${errorInfo.type}`);
    }
  }

  private getRetryStrategy(): RetryStrategy {
    switch (this.config.retryStrategy) {
      case 'exponential':
        return new ExponentialBackoffStrategy();
      case 'linear':
        return new LinearBackoffStrategy();
      case 'fixed':
        return new FixedDelayStrategy();
      default:
        return new ExponentialBackoffStrategy();
    }
  }
}

interface ErrorInfo {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  retryable: boolean;
  step: string;
}

interface RetryStrategy {
  delay(retryCount: number): Promise<void>;
}

class ExponentialBackoffStrategy implements RetryStrategy {
  async delay(retryCount: number): Promise<void> {
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s...
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

class LinearBackoffStrategy implements RetryStrategy {
  async delay(retryCount: number): Promise<void> {
    const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s, 4s...
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

class FixedDelayStrategy implements RetryStrategy {
  async delay(_retryCount: number): Promise<void> {
    const delay = 2000; // Fixed 2 second delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
