// Core types and interfaces for the Workflow Orchestrator

export interface CompanyData {
  name: string;
  industry: 'Technology' | 'Finance' | 'Healthcare' | 'Manufacturing';
  revenue: number;
  expenses: number;
  assets: number;
  liabilities: number;
  netIncome?: number;
  equity?: number;
}

export interface ValuationMethodResult {
  value: number;
  confidence: number;
  assumptions: string[];
  error?: string;
}

export interface ValuationResult {
  valuations: {
    dcf: ValuationMethodResult;
    comparable: ValuationMethodResult;
    asset: ValuationMethodResult;
  };
  finalValuation: number;
  confidenceInterval: {
    min: number;
    max: number;
    confidence: number;
  };
  methodology: string;
  timestamp: string;
}

export interface StepOutput {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startTime: Date | null;
  endTime: Date | null;
  output: any;
  error: Error | null;
  duration?: number;
}

export interface WorkflowContext {
  data: Map<string, any>;
  metadata: {
    workflowId: string;
    startTime: Date | null;
    endTime: Date | null;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
  };
  stepOutputs: Map<string, StepOutput>;
  errors: Error[];
  
  // Methods
  setData(key: string, value: any): void;
  getData(key: string): any;
  setStepOutput(stepName: string, output: any): void;
  getStepOutput(stepName: string): any;
}

export interface WorkflowConfig {
  workflowId: string;
  name: string;
  version: string;
  steps: StepConfig[];
  errorHandling: ErrorHandlingConfig;
  logging: LoggingConfig;
}

export interface StepConfig {
  name: string;
  type: string;
  config: Record<string, any>;
  dependencies: string[];
}

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryStrategy: 'exponential' | 'linear' | 'fixed';
  fallbackEnabled: boolean;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableFileLogging: boolean;
  enableConsoleLogging: boolean;
}

export interface ExecutionReport {
  workflowId: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  startTime: string;
  endTime: string;
  duration: number;
  steps: StepExecutionSummary[];
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    successRate: number;
  };
  errors: ErrorSummary[];
  metrics: PerformanceMetrics;
}

export interface StepExecutionSummary {
  name: string;
  status: 'COMPLETED' | 'FAILED';
  startTime: string;
  endTime: string;
  duration: number;
  error?: string;
}

export interface ErrorSummary {
  step: string;
  message: string;
  type: string;
  timestamp: string;
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  averageStepTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ValidationResult {
  isValid: boolean;
  qualityScore: {
    score: number;
    issues: string[];
  };
  validatedData: CompanyData;
  validationTimestamp: string;
}

export interface OutputResult {
  formattedOutput: Record<string, any>;
  savedLocations: string[];
  timestamp: string;
}

// Error types
export class WorkflowError extends Error {
  constructor(
    message: string,
    public step: string,
    public type: string = 'WORKFLOW_ERROR'
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ExecutionError extends Error {
  constructor(
    message: string,
    public step: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}
