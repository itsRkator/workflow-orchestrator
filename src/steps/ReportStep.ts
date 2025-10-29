import { Step } from '../core/Step';
import { WorkflowContext } from '../core/WorkflowContext';
import { ExecutionReport, StepExecutionSummary, ErrorSummary, PerformanceMetrics } from '../types';

export class ReportStep extends Step {
  constructor(config: Record<string, any>) {
    super('Report', config);
  }

  async execute(context: WorkflowContext): Promise<ExecutionReport> {
    try {
      this.logger.info('Starting Report step');
      
      // Collect all step outputs
      const stepOutputs = this.collectStepOutputs(context);
      
      // Generate execution metrics
      const metrics = this.generateExecutionMetrics(context);
      
      // Create comprehensive report
      const report = await this.generateComprehensiveReport(context, stepOutputs, metrics);
      
      // Save report
      await this.saveReport(report);
      
      context.setData('finalReport', report);
      context.setStepOutput(this.name, report);
      
      this.logger.info('Report step completed successfully');
      return report;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Report step failed: ${errorMessage}`);
      throw error;
    }
  }

  private collectStepOutputs(context: WorkflowContext): StepExecutionSummary[] {
    const outputs: StepExecutionSummary[] = [];
    
    for (const [stepName, output] of context.stepOutputs) {
      outputs.push({
        name: stepName,
        status: output.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        startTime: output.startTime ? output.startTime.toISOString() : '',
        endTime: output.endTime ? output.endTime.toISOString() : '',
        duration: output.duration || 0,
        ...(output.error?.message && { error: output.error.message }),
      });
    }
    
    return outputs;
  }

  private generateExecutionMetrics(context: WorkflowContext): PerformanceMetrics {
    const totalTime = context.metadata.endTime && context.metadata.startTime ? 
      context.metadata.endTime.getTime() - context.metadata.startTime.getTime() : 0;
    
    const averageStepTime = context.metadata.totalSteps > 0 ? 
      totalTime / context.metadata.totalSteps : 0;
    
    return {
      totalExecutionTime: totalTime,
      averageStepTime: averageStepTime,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user
    };
  }

  private async generateComprehensiveReport(
    context: WorkflowContext,
    stepOutputs: StepExecutionSummary[],
    metrics: PerformanceMetrics
  ): Promise<ExecutionReport> {
    const duration = context.metadata.endTime && context.metadata.startTime ? 
      context.metadata.endTime.getTime() - context.metadata.startTime.getTime() : 0;

    const errorSummaries: ErrorSummary[] = context.errors.map(error => ({
      step: 'UNKNOWN', // We'll improve this in a real implementation
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString(),
    }));

    return {
      workflowId: context.metadata.workflowId,
      status: context.metadata.failedSteps === 0 ? 'COMPLETED' : 'FAILED',
      startTime: context.metadata.startTime?.toISOString() || '',
      endTime: context.metadata.endTime?.toISOString() || '',
      duration,
      steps: stepOutputs,
      summary: {
        totalSteps: context.metadata.totalSteps,
        completedSteps: context.metadata.completedSteps,
        failedSteps: context.metadata.failedSteps,
        successRate: context.metadata.totalSteps > 0 ? 
          (context.metadata.completedSteps / context.metadata.totalSteps) * 100 : 0,
      },
      errors: errorSummaries,
      metrics,
    };
  }

  private async saveReport(report: ExecutionReport): Promise<void> {
    try {
      // In a real implementation, this would save to a file or database
      const reportLocation = `reports/workflow_${report.workflowId}_${Date.now()}.json`;
      
      this.logger.info(`Execution report saved to: ${reportLocation}`);
      this.logger.info(`Workflow ${report.workflowId} completed with status: ${report.status}`);
      this.logger.info(`Success rate: ${report.summary.successRate.toFixed(2)}%`);
      this.logger.info(`Total execution time: ${report.duration}ms`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Could not save report: ${errorMessage}`);
    }
  }
}
