import { WorkflowContext as IWorkflowContext, StepOutput } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowContext implements IWorkflowContext {
  public data: Map<string, any>;
  public metadata: {
    workflowId: string;
    startTime: Date | null;
    endTime: Date | null;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
  };
  public stepOutputs: Map<string, StepOutput>;
  public errors: Error[];

  constructor(workflowId: string, totalSteps: number) {
    this.data = new Map();
    this.metadata = {
      workflowId: workflowId || uuidv4(),
      startTime: null,
      endTime: null,
      totalSteps,
      completedSteps: 0,
      failedSteps: 0,
    };
    this.stepOutputs = new Map();
    this.errors = [];
  }

  setData(key: string, value: any): void {
    this.data.set(key, value);
  }

  getData(key: string): any {
    return this.data.get(key);
  }

  setStepOutput(stepName: string, output: any): void {
    const currentOutput = this.stepOutputs.get(stepName);
    if (currentOutput) {
      this.stepOutputs.set(stepName, { ...currentOutput, output });
    } else {
      this.stepOutputs.set(stepName, {
        status: 'COMPLETED', // Assuming completed if setting output directly
        startTime: new Date(),
        endTime: new Date(),
        output: output,
        error: null,
        duration: 0,
      });
    }
  }

  getStepOutput(stepName: string): any {
    return this.stepOutputs.get(stepName);
  }
}
