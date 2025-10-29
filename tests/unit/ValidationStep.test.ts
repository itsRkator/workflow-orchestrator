import { ValidationStep } from '../../src/steps/ValidationStep';
import { WorkflowContext } from '../../src/core/WorkflowContext';
import { Logger } from '../../src/utils/logger';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
}));

// Mock Logger
jest.mock('../../src/utils/logger');

describe('ValidationStep', () => {
  let step: ValidationStep;
  let mockContext: WorkflowContext;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
    mockContext = new WorkflowContext('test-workflow', 1);
    
    step = new ValidationStep({
      schema: {
        name: 'string',
        industry: 'string',
        revenue: 'number',
        expenses: 'number',
        assets: 'number',
        liabilities: 'number',
      },
      businessRules: {
        minRevenue: 0,
        maxExpenseRatio: 0.8,
        minAssetValue: 0,
      },
    });
  });

  describe('schema validation', () => {
    it('should validate correct data structure', async () => {
      const validData = {
        name: 'Test Company',
        industry: 'Technology',
        revenue: 1000000,
        expenses: 600000,
        assets: 2000000,
        liabilities: 500000,
        netIncome: 400000,
        equity: 1500000,
      };

      mockContext.setData('inputData', validData);
      
      const result = await step.execute(mockContext);
      
      expect(result).toEqual(
        expect.objectContaining({
          isValid: true,
          validatedData: validData,
          qualityScore: expect.objectContaining({
            score: expect.any(Number),
            issues: expect.any(Array),
          }),
          validationTimestamp: expect.any(String),
        })
      );
      
      expect(mockLogger.info).toHaveBeenCalledWith('Starting Validation step');
      expect(mockLogger.info).toHaveBeenCalledWith('Validation step completed successfully');
    });

    it('should reject invalid data types', async () => {
      const invalidData = {
        name: 123, // Should be string
        industry: 'Technology',
        revenue: 'not-a-number', // Should be number
        expenses: 600000,
        assets: 2000000,
        liabilities: 500000,
        netIncome: 400000,
        equity: 1500000,
      };

      mockContext.setData('inputData', invalidData);
      
      await expect(step.execute(mockContext)).rejects.toThrow();
    });

    it('should reject missing required fields', async () => {
      const incompleteData = {
        name: 'Test Company',
        // Missing required fields
      };

      mockContext.setData('inputData', incompleteData);
      
      await expect(step.execute(mockContext)).rejects.toThrow();
    });
  });

  describe('business rules validation', () => {
    it('should validate business rules correctly', async () => {
      const validData = {
        name: 'Test Company',
        industry: 'Technology',
        revenue: 1000000,
        expenses: 600000, // 60% of revenue (within 80% limit)
        assets: 2000000,
        liabilities: 500000,
        netIncome: 400000,
        equity: 1500000,
      };

      mockContext.setData('inputData', validData);
      
      const result = await step.execute(mockContext);
      
      expect(result.isValid).toBe(true);
      expect(result.qualityScore).toBeDefined();
    });

    it('should reject data violating business rules', async () => {
      const invalidData = {
        name: 'Test Company',
        industry: 'Technology',
        revenue: 1000000,
        expenses: 900000, // 90% of revenue (exceeds 80% limit)
        assets: 2000000,
        liabilities: 500000,
      };

      mockContext.setData('inputData', invalidData);
      
      await expect(step.execute(mockContext)).rejects.toThrow();
    });

    it('should reject negative revenue', async () => {
      const invalidData = {
        name: 'Test Company',
        industry: 'Technology',
        revenue: -1000000, // Negative revenue
        expenses: 600000,
        assets: 2000000,
        liabilities: 500000,
      };

      mockContext.setData('inputData', invalidData);
      
      await expect(step.execute(mockContext)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle missing company data', async () => {
      // No data set in context
      
      await expect(step.execute(mockContext)).rejects.toThrow();
    });

    it('should provide detailed error messages', async () => {
      const invalidData = {
        name: '', // Empty name
        industry: 'Technology',
        revenue: -1000, // Negative revenue
        expenses: 600000,
        assets: 2000000,
        liabilities: 500000,
      };

      mockContext.setData('inputData', invalidData);
      
      try {
        await step.execute(mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('validation');
      }
    });
  });

  describe('cleanup', () => {
    it('should complete cleanup successfully', async () => {
      await expect(step.cleanup()).resolves.toBeUndefined();
    });
  });
});
