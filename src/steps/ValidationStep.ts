import Joi from 'joi';
import { Step } from '../core/Step';
import { WorkflowContext } from '../core/WorkflowContext';
import { CompanyData, ValidationResult, ValidationError } from '../types';

export class ValidationStep extends Step {
  constructor(config: Record<string, any>) {
    super('Validation', config);
  }

  async execute(context: WorkflowContext): Promise<ValidationResult> {
    try {
      this.logger.info('Starting Validation step');
      
      const inputData = context.getData('inputData') as CompanyData;
      
      if (!inputData) {
        throw new ValidationError('No input data found for validation');
      }
      
      // Schema validation
      await this.validateSchema(inputData);
      
      // Business rule validation
      const businessValidation = await this.validateBusinessRules(inputData);
      
      if (!businessValidation.isValid) {
        throw new ValidationError('Business rule validation failed', businessValidation.errors);
      }
      
      // Data quality checks
      const qualityScore = await this.checkDataQuality(inputData);
      
      const validationOutput: ValidationResult = {
        isValid: true,
        qualityScore: qualityScore,
        validatedData: inputData,
        validationTimestamp: new Date().toISOString()
      };
      
      context.setData('validatedData', validationOutput);
      context.setStepOutput(this.name, validationOutput);
      
      this.logger.info('Validation step completed successfully');
      return validationOutput;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Validation step failed: ${errorMessage}`);
      throw error;
    }
  }

  private async validateSchema(data: CompanyData): Promise<void> {
    const schema = Joi.object({
      name: Joi.string().min(1).max(100).required(),
      industry: Joi.string().valid('Technology', 'Finance', 'Healthcare', 'Manufacturing').required(),
      revenue: Joi.number().min(0).max(1000000000).required(),
      expenses: Joi.number().min(0).max(1000000000).required(),
      assets: Joi.number().min(0).max(1000000000).required(),
      liabilities: Joi.number().min(0).max(1000000000).required(),
      netIncome: Joi.number().required(),
      equity: Joi.number().required()
    });

    const { error } = schema.validate(data);
    
    if (error) {
      throw new ValidationError(`Schema validation failed: ${error.details[0]?.message ?? 'Unknown validation error'}`, error.details);
    }
  }

  private async validateBusinessRules(data: CompanyData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Rule 1: Revenue should be greater than expenses
    if (data.revenue <= data.expenses) {
      errors.push('Revenue must be greater than expenses');
    }

    // Rule 2: Assets should be greater than liabilities
    if (data.assets <= data.liabilities) {
      errors.push('Assets must be greater than liabilities');
    }

    // Rule 3: Net income should be positive
    if (data.netIncome! <= 0) {
      errors.push('Net income must be positive');
    }

    // Rule 4: Equity should be positive
    if (data.equity! <= 0) {
      errors.push('Equity must be positive');
    }

    // Rule 5: Revenue to expense ratio should be reasonable (between 1.1 and 10)
    const revenueToExpenseRatio = data.revenue / data.expenses;
    if (revenueToExpenseRatio < 1.1 || revenueToExpenseRatio > 10) {
      errors.push('Revenue to expense ratio should be between 1.1 and 10');
    }

    // Rule 6: Asset to liability ratio should be reasonable (between 1.1 and 5)
    const assetToLiabilityRatio = data.assets / data.liabilities;
    if (assetToLiabilityRatio < 1.1 || assetToLiabilityRatio > 5) {
      errors.push('Asset to liability ratio should be between 1.1 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async checkDataQuality(data: CompanyData): Promise<{ score: number; issues: string[] }> {
    let score = 100;
    const issues: string[] = [];

    // Check for reasonable financial ratios
    const revenueToExpenseRatio = data.revenue / data.expenses;
    if (revenueToExpenseRatio < 0.5 || revenueToExpenseRatio > 10) {
      score -= 20;
      issues.push('Unusual revenue to expense ratio');
    }

    // Check for negative equity
    if (data.equity! < 0) {
      score -= 30;
      issues.push('Negative equity detected');
    }

    // Check for missing critical data
    if (!data.name || data.name.trim().length === 0) {
      score -= 50;
      issues.push('Missing company name');
    }

    // Check for unrealistic values
    if (data.revenue > 1000000000) {
      score -= 10;
      issues.push('Very high revenue value');
    }

    if (data.expenses > data.revenue) {
      score -= 25;
      issues.push('Expenses exceed revenue');
    }

    return {
      score: Math.max(0, score),
      issues
    };
  }
}
