import { Step } from '../../src/core/Step';
import { WorkflowContext } from '../../src/core/WorkflowContext';
import { Logger } from '../../src/utils/logger';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
}));

// Mock Logger
jest.mock('../../src/utils/logger');

describe('Step', () => {
  let mockContext: WorkflowContext;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockContext = new WorkflowContext('test-workflow', 1);
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
  });

  // Test implementation of Step for testing
  class TestStep extends Step {
    constructor(name: string, config: Record<string, any>) {
      super(name, config);
    }

    async execute(context: WorkflowContext): Promise<any> {
      return { result: 'test-success' };
    }
  }

  describe('constructor', () => {
    it('should initialize step with correct properties', () => {
      const step = new TestStep('TestStep', { key: 'value' });
      
      expect(step.name).toBe('TestStep');
      expect(step.config).toEqual({ key: 'value' });
      expect(step.status).toBe('PENDING');
      expect(step.startTime).toBeNull();
      expect(step.endTime).toBeNull();
      expect(step.error).toBeNull();
      expect(step.output).toBeNull();
      expect(step.duration).toBe(0);
    });
  });

  describe('validate', () => {
    it('should return input by default', async () => {
      const step = new TestStep('TestStep', {});
      const input = { test: 'data' };
      
      const result = await step.validate(input);
      expect(result).toBe(input);
    });
  });

  describe('cleanup', () => {
    it('should complete without error by default', async () => {
      const step = new TestStep('TestStep', {});
      
      await expect(step.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('handleError', () => {
    it('should set error properties and update context', () => {
      const step = new TestStep('TestStep', {});
      const error = new Error('Test error');
      
      step.handleError(error, mockContext);
      
      expect(step.error).toBe(error);
      expect(step.status).toBe('FAILED');
      expect(step.endTime).toBeInstanceOf(Date);
      expect(mockContext.errors).toContain(error);
      expect(mockContext.metadata.failedSteps).toBe(1);
    });
  });
});
