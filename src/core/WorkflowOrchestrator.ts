import { Logger } from '../utils/logger';
import { ErrorHandler } from './ErrorHandler';
import { Step } from './Step';
import { WorkflowContext } from './WorkflowContext';
import {
  WorkflowConfig,
  StepOutput,
  ExecutionReport,
  WorkflowError,
  StepExecutionSummary,
  ErrorSummary,
  PerformanceMetrics,
} from '../types';

export class WorkflowOrchestrator {
  private config: WorkflowConfig;
  private steps: Step[] = [];
  private context: WorkflowContext;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor(config: WorkflowConfig) {
    this.config = config;
    this.context = this.createContext();
    this.logger = new Logger();
    this.errorHandler = new ErrorHandler(config.errorHandling);
  }

  private createContext(): WorkflowContext {
    return new WorkflowContext(this.config.workflowId, 0);
  }

  addStep(step: Step): void {
    this.steps.push(step);
    this.context.metadata.totalSteps = this.steps.length;
    this.logger.info(`Added step: ${step.name}`);
  }

  async execute(): Promise<ExecutionReport> {
    this.logger.info(`Starting workflow execution: ${this.config.name}`);
    this.context.metadata.startTime = new Date();

    try {
      // Validate workflow configuration
      await this.validateWorkflow();

      // Execute steps sequentially
      for (const step of this.steps) {
        await this.executeStep(step);
        
        // Check if workflow should continue after step failure
        if (step.status === 'FAILED' && !this.config.errorHandling.fallbackEnabled) {
          throw new WorkflowError(
            `Workflow failed at step: ${step.name}`,
            step.name
          );
        }
      }

      this.context.metadata.endTime = new Date();
      this.logger.info('Workflow execution completed successfully');

      return this.generateExecutionReport();
    } catch (error) {
      this.context.metadata.endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Workflow execution failed: ${errorMessage}`);
      
      if (error instanceof WorkflowError) {
        throw error;
      }
      throw new WorkflowError(
        `Unexpected workflow error: ${errorMessage}`,
        'WORKFLOW'
      );
    }
  }

  private async validateWorkflow(): Promise<void> {
    if (this.steps.length === 0) {
      throw new WorkflowError('No steps configured for workflow', 'WORKFLOW');
    }

    if (this.steps.length < 3) {
      throw new WorkflowError(
        'Workflow must have at least 3 steps',
        'WORKFLOW'
      );
    }

    this.logger.info(`Workflow validation passed. Steps: ${this.steps.length}`);
  }

  private async executeStep(step: Step): Promise<void> {
    this.logger.info(`Executing step: ${step.name}`);
    
    step.status = 'RUNNING';
    step.startTime = new Date();

    const stepOutput: StepOutput = {
      status: 'RUNNING',
      startTime: step.startTime || new Date(),
      endTime: null,
      output: null,
      error: null,
    };

    this.context.stepOutputs.set(step.name, stepOutput);

    try {
      // Execute the step
      const result = await step.execute(this.context);
      
      // Update step status
      step.status = 'COMPLETED';
      step.endTime = new Date();
      step.output = result;
      step.duration = step.endTime.getTime() - step.startTime!.getTime();

      // Update step output
      stepOutput.status = 'COMPLETED';
      stepOutput.endTime = step.endTime;
      stepOutput.output = result;
      stepOutput.duration = step.duration;

      // Update the stepOutput in context
      this.context.stepOutputs.set(step.name, stepOutput);

      this.context.metadata.completedSteps++;
      
      this.logger.info(`Step ${step.name} completed successfully in ${step.duration}ms`);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      step.handleError(errorObj, this.context);
      
      // Update step output
      stepOutput.status = 'FAILED';
      stepOutput.endTime = step.endTime;
      stepOutput.error = step.error;
      stepOutput.duration = step.endTime ? 
        step.endTime.getTime() - step.startTime!.getTime() : 0;

      // Update the stepOutput in context
      this.context.stepOutputs.set(step.name, stepOutput);

      // Handle error with retry logic
      await this.errorHandler.handleError(error as Error, step, this.context);
    }
  }

  private generateExecutionReport(): ExecutionReport {
    const duration = this.context.metadata.endTime!.getTime() - 
                    this.context.metadata.startTime!.getTime();

    const stepSummaries: StepExecutionSummary[] = Array.from(
      this.context.stepOutputs.entries()
    ).map(([stepName, output]) => ({
      name: stepName,
      status: output.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
      startTime: output.startTime ? output.startTime.toISOString() : '',
      endTime: output.endTime ? output.endTime.toISOString() : '',
      duration: output.duration || 0,
      ...(output.error?.message && { error: output.error.message }),
    }));

    const errorSummaries: ErrorSummary[] = this.context.errors.map(error => ({
      step: 'UNKNOWN', // We'll improve this
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString(),
    }));

    const metrics: PerformanceMetrics = {
      totalExecutionTime: duration,
      averageStepTime: duration / this.context.metadata.totalSteps,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user,
    };

    return {
      workflowId: this.config.workflowId,
      status: this.context.metadata.failedSteps === 0 ? 'COMPLETED' : 'FAILED',
      startTime: this.context.metadata.startTime!.toISOString(),
      endTime: this.context.metadata.endTime!.toISOString(),
      duration,
      steps: stepSummaries,
      summary: {
        totalSteps: this.context.metadata.totalSteps,
        completedSteps: this.context.metadata.completedSteps,
        failedSteps: this.context.metadata.failedSteps,
        successRate: (this.context.metadata.completedSteps / this.context.metadata.totalSteps) * 100,
      },
      errors: errorSummaries,
      metrics,
    };
  }

  getExecutionReport(): ExecutionReport {
    return this.generateExecutionReport();
  }

  getContext(): WorkflowContext {
    return this.context;
  }
}
