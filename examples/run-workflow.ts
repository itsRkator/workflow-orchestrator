import { WorkflowOrchestrator } from '../src/core/WorkflowOrchestrator';
import { DataInputStep } from '../src/steps/DataInputStep';
import { ValidationStep } from '../src/steps/ValidationStep';
import { ValuationStep } from '../src/steps/ValuationStep';
import { OutputStep } from '../src/steps/OutputStep';
import { ReportStep } from '../src/steps/ReportStep';
import { WorkflowConfig } from '../src/types';

async function runWorkflowExample() {
  console.log('🚀 Starting Workflow Orchestrator Example');
  console.log('==========================================');

  // Create workflow configuration
  const config: WorkflowConfig = {
    workflowId: 'example-workflow-001',
    name: 'Valuation Workflow Example',
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

  try {
    // Create orchestrator
    const orchestrator = new WorkflowOrchestrator(config);

    // Add steps
    orchestrator.addStep(new DataInputStep(config.steps[0]!.config));
    orchestrator.addStep(new ValidationStep(config.steps[1]!.config));
    orchestrator.addStep(new ValuationStep(config.steps[2]!.config));
    orchestrator.addStep(new OutputStep(config.steps[3]!.config));
    orchestrator.addStep(new ReportStep(config.steps[4]!.config));

    console.log('📋 Workflow Configuration:');
    console.log(`   - Workflow ID: ${config.workflowId}`);
    console.log(`   - Name: ${config.name}`);
    console.log(`   - Steps: ${config.steps.length}`);
    console.log(`   - Error Handling: ${config.errorHandling.maxRetries} retries`);
    console.log('');

    // Execute workflow
    console.log('⚡ Executing Workflow...');
    const startTime = Date.now();
    
    const result = await orchestrator.execute();
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log('');
    console.log('✅ Workflow Execution Completed!');
    console.log('==================================');
    console.log(`Status: ${result.status}`);
    console.log(`Execution Time: ${executionTime}ms`);
    console.log(`Success Rate: ${result.summary.successRate.toFixed(2)}%`);
    console.log(`Total Steps: ${result.summary.totalSteps}`);
    console.log(`Completed Steps: ${result.summary.completedSteps}`);
    console.log(`Failed Steps: ${result.summary.failedSteps}`);
    
    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message} (${error.type})`);
      });
    }

    console.log('');
    console.log('📊 Performance Metrics:');
    console.log(`   - Total Execution Time: ${result.metrics.totalExecutionTime}ms`);
    console.log(`   - Average Step Time: ${result.metrics.averageStepTime.toFixed(2)}ms`);
    console.log(`   - Memory Usage: ${(result.metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

    console.log('');
    console.log('🎯 Step Details:');
    result.steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.name}: ${step.status} (${step.duration}ms)`);
    });

  } catch (error) {
    console.error('');
    console.error('❌ Workflow Execution Failed!');
    console.error('=============================');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  runWorkflowExample().catch(console.error);
}

export { runWorkflowExample };
