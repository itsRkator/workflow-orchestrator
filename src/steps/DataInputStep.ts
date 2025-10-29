import Joi from 'joi';
import { Step } from '../core/Step';
import { WorkflowContext } from '../core/WorkflowContext';
import { CompanyData, ValidationError } from '../types';

export class DataInputStep extends Step {
  constructor(config: Record<string, any>) {
    super('DataInput', config);
  }

  async execute(context: WorkflowContext): Promise<CompanyData> {
    try {
      this.logger.info('Starting DataInput step');
      
      // Load data from configured source
      const rawData = await this.loadData();
      
      // Validate input data
      const validatedData = await this.validate(rawData);
      
      // Transform data to standard format
      const transformedData = this.transformData(validatedData);
      
      // Store in context
      context.setData('inputData', transformedData);
      context.setStepOutput(this.name, transformedData);
      
      this.logger.info('DataInput step completed successfully');
      return transformedData;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`DataInput step failed: ${errorMessage}`);
      throw error;
    }
  }

  override async validate(data: any): Promise<CompanyData> {
    const schema = Joi.object({
      company: Joi.object({
        name: Joi.string().required(),
        industry: Joi.string().valid('Technology', 'Finance', 'Healthcare', 'Manufacturing').required(),
        revenue: Joi.number().positive().required(),
        expenses: Joi.number().positive().required(),
        assets: Joi.number().positive().required(),
        liabilities: Joi.number().positive().required()
      }).required()
    });

    const { error, value } = schema.validate(data);
    
    if (error) {
      throw new ValidationError(`Data validation failed: ${error.details[0]?.message ?? 'Unknown validation error'}`, error.details);
    }

    return value;
  }

  private async loadData(): Promise<any> {
    const sourceType = this.config.source?.type || 'mock';
    switch (sourceType) {
      case 'file':
        return await this.loadFromFile(this.config.source?.path || '');
      case 'api':
        return await this.loadFromAPI(this.config.source?.url || '');
      case 'provided':
        return this.config.source?.data ?? this.generateMockData();
      case 'mock':
      default:
        return this.generateMockData();
    }
  }

  private async loadFromFile(_filePath: string): Promise<any> {
    // In a real implementation, this would read from a file
    // For now, we'll throw an error to indicate it's not implemented
    throw new Error('File loading not implemented in this demo');
  }

  private async loadFromAPI(_url: string): Promise<any> {
    // In a real implementation, this would make an API call
    // For now, we'll throw an error to indicate it's not implemented
    throw new Error('API loading not implemented in this demo');
  }

  private generateMockData(): any {
    const mockCompanies = [
      {
        company: {
          name: 'TechCorp Inc',
          industry: 'Technology',
          revenue: 10000000,
          expenses: 7000000,
          assets: 15000000,
          liabilities: 5000000
        }
      },
      {
        company: {
          name: 'FinanceFirst Ltd',
          industry: 'Finance',
          revenue: 25000000,
          expenses: 18000000,
          assets: 50000000,
          liabilities: 20000000
        }
      },
      {
        company: {
          name: 'HealthTech Solutions',
          industry: 'Healthcare',
          revenue: 15000000,
          expenses: 12000000,
          assets: 30000000,
          liabilities: 8000000
        }
      },
      {
        company: {
          name: 'ManufacturingPro',
          industry: 'Manufacturing',
          revenue: 50000000,
          expenses: 35000000,
          assets: 80000000,
          liabilities: 25000000
        }
      }
    ];

    // Return a random company for demo purposes
    const randomIndex = Math.floor(Math.random() * mockCompanies.length);
    return mockCompanies[randomIndex];
  }

  private transformData(data: any): CompanyData {
    const company = data.company;
    
    return {
      ...company,
      netIncome: company.revenue - company.expenses,
      equity: company.assets - company.liabilities
    };
  }
}
