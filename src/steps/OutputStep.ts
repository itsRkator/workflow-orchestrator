import { Step } from '../core/Step';
import { WorkflowContext } from '../core/WorkflowContext';
import { ValuationResult, ValidationResult, OutputResult } from '../types';

export class OutputStep extends Step {
  constructor(config: Record<string, any>) {
    super('Output', config);
  }

  async execute(context: WorkflowContext): Promise<OutputResult> {
    try {
      this.logger.info('Starting Output step');
      
      const valuationResult = context.getData('valuationResult') as ValuationResult;
      const validatedData = context.getData('validatedData') as ValidationResult;
      
      if (!valuationResult || !validatedData) {
        throw new Error('Missing required data for output generation');
      }
      
      // Generate formatted output
      const formattedOutput = await this.generateFormattedOutput(valuationResult, validatedData);
      
      // Save output to configured destinations
      const savedLocations = await this.saveOutput(formattedOutput);
      
      const outputResult: OutputResult = {
        formattedOutput: formattedOutput,
        savedLocations: savedLocations,
        timestamp: new Date().toISOString()
      };
      
      context.setData('outputResult', outputResult);
      context.setStepOutput(this.name, outputResult);
      
      this.logger.info('Output step completed successfully');
      return outputResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Output step failed: ${errorMessage}`);
      throw error;
    }
  }

  private async generateFormattedOutput(
    valuationResult: ValuationResult, 
    validatedData: ValidationResult
  ): Promise<Record<string, any>> {
    const output = {
      company: validatedData.validatedData,
      valuation: {
        finalValue: valuationResult.finalValuation,
        confidenceInterval: valuationResult.confidenceInterval,
        methodology: valuationResult.methodology,
        individualValuations: valuationResult.valuations
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        workflowVersion: '1.0.0',
        dataQuality: validatedData.qualityScore
      }
    };

    const formattedOutputs: Record<string, any> = {};
    
    // Generate JSON output
    formattedOutputs.json = output;
    
    // Generate CSV output (simplified)
    formattedOutputs.csv = this.generateCSVOutput(output);
    
    // Generate summary output
    formattedOutputs.summary = this.generateSummaryOutput(output);

    return formattedOutputs;
  }

  private generateCSVOutput(output: any): string {
    const company = output.company;
    const valuation = output.valuation;
    
    const csvLines = [
      'Field,Value',
      `Company Name,${company.name}`,
      `Industry,${company.industry}`,
      `Revenue,${company.revenue}`,
      `Expenses,${company.expenses}`,
      `Assets,${company.assets}`,
      `Liabilities,${company.liabilities}`,
      `Net Income,${company.netIncome}`,
      `Equity,${company.equity}`,
      `Final Valuation,${valuation.finalValue}`,
      `Confidence Interval Min,${valuation.confidenceInterval.min}`,
      `Confidence Interval Max,${valuation.confidenceInterval.max}`,
      `Confidence Level,${valuation.confidenceInterval.confidence}%`,
      `DCF Valuation,${valuation.individualValuations.dcf.value}`,
      `Comparable Valuation,${valuation.individualValuations.comparable.value}`,
      `Asset-Based Valuation,${valuation.individualValuations.asset.value}`,
      `Data Quality Score,${output.metadata.dataQuality.score}%`,
      `Generated At,${output.metadata.generatedAt}`
    ];
    
    return csvLines.join('\n');
  }

  private generateSummaryOutput(output: any): any {
    const company = output.company;
    const valuation = output.valuation;
    
    return {
      companyName: company.name,
      industry: company.industry,
      financialSummary: {
        revenue: company.revenue,
        expenses: company.expenses,
        netIncome: company.netIncome,
        assets: company.assets,
        liabilities: company.liabilities,
        equity: company.equity
      },
      valuationSummary: {
        finalValue: valuation.finalValue,
        confidenceLevel: `${valuation.confidenceInterval.confidence}%`,
        valueRange: `${valuation.confidenceInterval.min.toLocaleString()} - ${valuation.confidenceInterval.max.toLocaleString()}`,
        methodology: valuation.methodology
      },
      qualityMetrics: {
        dataQualityScore: `${output.metadata.dataQuality.score}%`,
        dataQualityIssues: output.metadata.dataQuality.issues
      },
      generatedAt: output.metadata.generatedAt
    };
  }

  private async saveOutput(_formattedOutput: Record<string, any>): Promise<string[]> {
    const savedLocations: string[] = [];
    
    // In a real implementation, this would save to actual files
    // For this demo, we'll simulate saving and return mock locations
    
    try {
      // Simulate saving JSON output
      const jsonLocation = `outputs/valuation_${Date.now()}.json`;
      savedLocations.push(jsonLocation);
      this.logger.info(`JSON output saved to: ${jsonLocation}`);
      
      // Simulate saving CSV output
      const csvLocation = `outputs/valuation_${Date.now()}.csv`;
      savedLocations.push(csvLocation);
      this.logger.info(`CSV output saved to: ${csvLocation}`);
      
      // Simulate saving summary output
      const summaryLocation = `outputs/summary_${Date.now()}.json`;
      savedLocations.push(summaryLocation);
      this.logger.info(`Summary output saved to: ${summaryLocation}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Some outputs could not be saved: ${errorMessage}`);
    }
    
    return savedLocations;
  }
}
