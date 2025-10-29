import { Logger } from '../utils/logger';
import { WorkflowContext } from './WorkflowContext';

export abstract class Step {
  public name: string;
  public config: Record<string, any>;
  public status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' = 'PENDING';
  public startTime: Date | null = null;
  public endTime: Date | null = null;
  public error: Error | null = null;
  public output: any = null;
  public duration: number = 0;
  protected logger: Logger;

  constructor(name: string, config: Record<string, any>) {
    this.name = name;
    this.config = config;
    this.logger = new Logger();
  }

  abstract execute(context: WorkflowContext): Promise<any>;

  async validate(input: any): Promise<any> {
    return input; // Default implementation - can be overridden
  }

  async cleanup(): Promise<void> {
    // Default implementation - can be overridden
  }

  public handleError(error: Error, context: WorkflowContext): void {
    this.error = error;
    this.status = 'FAILED';
    this.endTime = new Date();
    context.errors.push(error);
    context.metadata.failedSteps++;
    
    this.logger.error(`Step ${this.name} failed: ${error.message}`, {
      step: this.name,
      error: error.message,
      stack: error.stack,
    });
  }
}
