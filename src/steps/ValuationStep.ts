import { Step } from '../core/Step';
import { WorkflowContext } from '../core/WorkflowContext';
import { CompanyData, ValidationResult, ValuationResult, ValuationMethodResult } from '../types';

export class ValuationStep extends Step {
  constructor(config: Record<string, any>) {
    super('Valuation', config);
  }

  async execute(context: WorkflowContext): Promise<ValuationResult> {
    try {
      this.logger.info('Starting Valuation step');
      
      const validationOutput = context.getData('validatedData') as ValidationResult;
      const validatedData = validationOutput.validatedData;
      
      if (!validatedData) {
        throw new Error('No validated data found for valuation');
      }
      
      // Execute multiple valuation methods
      const valuations = await this.executeValuationMethods(validatedData);
      
      // Calculate weighted average
      const finalValuation = this.calculateWeightedValuation(valuations);
      
      // Generate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(valuations);
      
      const valuationOutput: ValuationResult = {
        valuations: valuations,
        finalValuation: finalValuation,
        confidenceInterval: confidenceInterval,
        methodology: this.config.methodology || 'Weighted Average',
        timestamp: new Date().toISOString()
      };
      
      context.setData('valuationResult', valuationOutput);
      context.setStepOutput(this.name, valuationOutput);
      
      this.logger.info('Valuation step completed successfully');
      return valuationOutput;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Valuation step failed: ${errorMessage}`);
      throw error;
    }
  }

  private async executeValuationMethods(data: CompanyData): Promise<{
    dcf: ValuationMethodResult;
    comparable: ValuationMethodResult;
    asset: ValuationMethodResult;
  }> {
    const results = {
      dcf: await this.calculateDCFValuation(data),
      comparable: await this.calculateComparableValuation(data),
      asset: await this.calculateAssetBasedValuation(data)
    };
    
    return results;
  }

  private async calculateDCFValuation(data: CompanyData): Promise<ValuationMethodResult> {
    try {
      // Simplified DCF calculation
      const discountRate = this.config.parameters?.discountRate || 0.1;
      const growthRate = this.config.parameters?.growthRate || 0.05;
      
      // Project future cash flows for 5 years
      const projectedCashFlows = [];
      let currentCashFlow = data.netIncome!;
      
      for (let year = 1; year <= 5; year++) {
        currentCashFlow *= (1 + growthRate);
        projectedCashFlows.push(currentCashFlow);
      }
      
      // Calculate terminal value (assuming 3% perpetual growth)
      const terminalGrowthRate = 0.03;
      const terminalValue = (currentCashFlow * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
      
      // Discount all cash flows to present value
      let presentValue = 0;
      projectedCashFlows.forEach((cashFlow, index) => {
        presentValue += cashFlow / Math.pow(1 + discountRate, index + 1);
      });
      
      // Add terminal value
      presentValue += terminalValue / Math.pow(1 + discountRate, 5);
      
      return {
        value: Math.round(presentValue),
        confidence: 85,
        assumptions: [
          `Discount rate: ${discountRate * 100}%`,
          `Growth rate: ${growthRate * 100}%`,
          `Terminal growth rate: ${terminalGrowthRate * 100}%`,
          '5-year projection period'
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        value: 0,
        confidence: 0,
        assumptions: [],
        error: `DCF calculation failed: ${errorMessage}`
      };
    }
  }

  private async calculateComparableValuation(data: CompanyData): Promise<ValuationMethodResult> {
    try {
      // Simplified comparable company analysis
      const industryMultipliers = {
        Technology: { revenue: 8, earnings: 25 },
        Finance: { revenue: 3, earnings: 15 },
        Healthcare: { revenue: 6, earnings: 20 },
        Manufacturing: { revenue: 2, earnings: 12 }
      };
      
      const multipliers = industryMultipliers[data.industry];
      
      // Calculate valuation using revenue and earnings multiples
      const revenueBasedValuation = data.revenue * multipliers.revenue;
      const earningsBasedValuation = data.netIncome! * multipliers.earnings;
      
      // Average the two approaches
      const averageValuation = (revenueBasedValuation + earningsBasedValuation) / 2;
      
      return {
        value: Math.round(averageValuation),
        confidence: 75,
        assumptions: [
          `Industry: ${data.industry}`,
          `Revenue multiple: ${multipliers.revenue}x`,
          `Earnings multiple: ${multipliers.earnings}x`,
          'Based on industry averages'
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        value: 0,
        confidence: 0,
        assumptions: [],
        error: `Comparable valuation failed: ${errorMessage}`
      };
    }
  }

  private async calculateAssetBasedValuation(data: CompanyData): Promise<ValuationMethodResult> {
    try {
      // Simplified asset-based valuation
      // Using book value as a base and applying industry-specific adjustments
      const bookValue = data.equity!;
      
      const industryAdjustments = {
        Technology: 1.5, // Tech companies often trade above book value
        Finance: 1.2,    // Financial companies closer to book value
        Healthcare: 1.3, // Healthcare companies above book value
        Manufacturing: 1.1 // Manufacturing companies closer to book value
      };
      
      const adjustment = industryAdjustments[data.industry];
      const assetBasedValuation = bookValue * adjustment;
      
      return {
        value: Math.round(assetBasedValuation),
        confidence: 60,
        assumptions: [
          `Industry adjustment: ${adjustment}x`,
          `Book value: $${bookValue.toLocaleString()}`,
          'Based on industry asset multiples'
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        value: 0,
        confidence: 0,
        assumptions: [],
        error: `Asset-based valuation failed: ${errorMessage}`
      };
    }
  }

  private calculateWeightedValuation(valuations: {
    dcf: ValuationMethodResult;
    comparable: ValuationMethodResult;
    asset: ValuationMethodResult;
  }): number {
    const weights = this.config.methodology?.weights || {
      dcf: 0.5,
      comparable: 0.3,
      asset: 0.2
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [method, result] of Object.entries(valuations)) {
      if (result.value && !result.error) {
        weightedSum += result.value * weights[method as keyof typeof weights];
        totalWeight += weights[method as keyof typeof weights];
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  private calculateConfidenceInterval(valuations: {
    dcf: ValuationMethodResult;
    comparable: ValuationMethodResult;
    asset: ValuationMethodResult;
  }): { min: number; max: number; confidence: number } {
    const values = Object.values(valuations)
      .filter(v => v.value && !v.error)
      .map(v => v.value);

    if (values.length === 0) {
      return { min: 0, max: 0, confidence: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    
    // Calculate confidence based on the range
    const range = max - min;
    const average = (min + max) / 2;
    const confidence = Math.max(0, 100 - (range / average) * 100);

    return { min, max, confidence: Math.round(confidence) };
  }
}
