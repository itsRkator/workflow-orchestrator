import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { WorkflowOrchestrator } from '../core/WorkflowOrchestrator';
import { DataInputStep } from '../steps/DataInputStep';
import { ValidationStep } from '../steps/ValidationStep';
import { ValuationStep } from '../steps/ValuationStep';
import { OutputStep } from '../steps/OutputStep';
import { ReportStep } from '../steps/ReportStep';
import { WorkflowConfig, CompanyData } from '../types';

export class WorkflowController {
  private router: Router;
  private logger: Logger;

  constructor() {
    this.router = Router();
    this.logger = new Logger();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Execute workflow endpoint
    this.router.post('/execute', this.executeWorkflow.bind(this));
    
    // Execute workflow with custom data endpoint
    this.router.post('/execute-with-data', this.executeWorkflowWithData.bind(this));
    
    // Get workflow status endpoint (placeholder for future implementation)
    this.router.get('/:workflowId/status', this.getWorkflowStatus.bind(this));
    
    // Get workflow report endpoint (placeholder for future implementation)
    this.router.get('/:workflowId/report', this.getWorkflowReport.bind(this));
  }

  private async executeWorkflow(_req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Received workflow execution request');
      
      const workflowConfig = this.createDefaultWorkflowConfig();
      const orchestrator = this.createWorkflowOrchestrator(workflowConfig);
      
      const result = await orchestrator.execute();
      
      res.json({
        success: true,
        workflowId: workflowConfig.workflowId,
        result: result,
        executionTime: result.duration
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Workflow execution failed: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'WORKFLOW_EXECUTION_FAILED',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private async executeWorkflowWithData(req: Request, res: Response): Promise<void> {
    try {
      this.logger.info('Received workflow execution request with custom data');
      
      const { inputData, config } = req.body;
      
      if (!inputData) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_INPUT_DATA',
            message: 'Input data is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      const workflowConfig = this.createWorkflowConfigWithData(inputData, config);
      const orchestrator = this.createWorkflowOrchestrator(workflowConfig);
      
      const result = await orchestrator.execute();
      
      res.json({
        success: true,
        workflowId: workflowConfig.workflowId,
        result: result,
        executionTime: result.duration
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Workflow execution with custom data failed: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: {
          code: 'WORKFLOW_EXECUTION_FAILED',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private async getWorkflowStatus(_req: Request, res: Response): Promise<void> {
    // Placeholder for future implementation
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Workflow status endpoint not yet implemented',
        timestamp: new Date().toISOString()
      }
    });
  }

  private async getWorkflowReport(_req: Request, res: Response): Promise<void> {
    // Placeholder for future implementation
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Workflow report endpoint not yet implemented',
        timestamp: new Date().toISOString()
      }
    });
  }

  private createDefaultWorkflowConfig(): WorkflowConfig {
    return {
      workflowId: uuidv4(),
      name: 'Valuation Workflow',
      version: '1.0.0',
      steps: [
        {
          name: 'DataInput',
          type: 'DataInputStep',
          config: {
            source: { type: 'mock' }
          },
          dependencies: []
        },
        {
          name: 'Validation',
          type: 'ValidationStep',
          config: {},
          dependencies: ['DataInput']
        },
        {
          name: 'Valuation',
          type: 'ValuationStep',
          config: {
            methodology: {
              weights: {
                dcf: 0.5,
                comparable: 0.3,
                asset: 0.2
              }
            },
            parameters: {
              discountRate: 0.1,
              growthRate: 0.05
            }
          },
          dependencies: ['Validation']
        },
        {
          name: 'Output',
          type: 'OutputStep',
          config: {
            destinations: ['file', 'console']
          },
          dependencies: ['Valuation']
        },
        {
          name: 'Report',
          type: 'ReportStep',
          config: {
            outputPath: 'reports/'
          },
          dependencies: ['Output']
        }
      ],
      errorHandling: {
        maxRetries: 3,
        retryStrategy: 'exponential',
        fallbackEnabled: true
      },
      logging: {
        level: 'info',
        enableFileLogging: true,
        enableConsoleLogging: true
      }
    };
  }

  private createWorkflowConfigWithData(inputData: CompanyData, customConfig?: any): WorkflowConfig {
    const baseConfig = this.createDefaultWorkflowConfig();
    
    // Override the DataInput step config to use provided data
    baseConfig.steps[0]!.config = {
      source: { type: 'provided' },
      data: inputData
    };
    
    // Apply any custom configuration
    if (customConfig) {
      if (customConfig.valuation) {
        baseConfig.steps[2]!.config = { ...baseConfig.steps[2]!.config, ...customConfig.valuation };
      }
      if (customConfig.errorHandling) {
        baseConfig.errorHandling = { ...baseConfig.errorHandling, ...customConfig.errorHandling };
      }
    }
    
    return baseConfig;
  }

  private createWorkflowOrchestrator(config: WorkflowConfig): WorkflowOrchestrator {
    const orchestrator = new WorkflowOrchestrator(config);
    
    // Add steps to orchestrator
    orchestrator.addStep(new DataInputStep(config.steps[0]!.config));
    orchestrator.addStep(new ValidationStep(config.steps[1]!.config));
    orchestrator.addStep(new ValuationStep(config.steps[2]!.config));
    orchestrator.addStep(new OutputStep(config.steps[3]!.config));
    orchestrator.addStep(new ReportStep(config.steps[4]!.config));
    
    return orchestrator;
  }

  public getRouter(): Router {
    return this.router;
  }
}
