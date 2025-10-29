import { ErrorHandler } from '../../src/core/ErrorHandler';
import { Step } from '../../src/core/Step';
import { WorkflowContext } from '../../src/core/WorkflowContext';
import { Logger } from '../../src/utils/logger';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
}));

// Mock Logger
jest.mock('../../src/utils/logger');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<Logger>;
  let mockStep: jest.Mocked<Step>;
  let mockContext: WorkflowContext;

  beforeEach(() => {
    // Disable retries to keep tests fast and deterministic
    errorHandler = new ErrorHandler({
      maxRetries: 0,
      retryStrategy: 'exponential',
      fallbackEnabled: true,
    });
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);

    mockStep = {
      name: 'TestStep',
      config: {},
      status: 'FAILED',
      startTime: new Date(),
      endTime: new Date(),
      error: new Error('Test error'),
      output: null,
      duration: 100,
      handleError: jest.fn(),
    } as any;

    mockContext = new WorkflowContext('test-workflow', 1);
  });

  describe('handleError', () => {
    it('should handle generic error without throwing', async () => {
      const error = new Error('test error');
      
      await expect(errorHandler.handleError(error, mockStep, mockContext)).resolves.toBeUndefined();
    });

    it('should handle different error types', async () => {
      const validationError = new Error('validation failed');
      validationError.name = 'ValidationError';
      
      await expect(errorHandler.handleError(validationError, mockStep, mockContext)).resolves.toBeUndefined();
      // Fallback should mark context
      expect(mockContext.data.get(`${mockStep.name}_fallback`)).toBe(true);
    });

    it('should handle network/timeout errors', async () => {
      const networkError = new Error('network timeout');
      networkError.name = 'NetworkError';
      
      await expect(errorHandler.handleError(networkError, mockStep, mockContext)).resolves.toBeUndefined();
    });
  });

  describe('retry strategies', () => {
    it('retries with exponential strategy without real delay', async () => {
      const handler = new ErrorHandler({ maxRetries: 2, retryStrategy: 'exponential', fallbackEnabled: true });
      (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);

      // no-op delay
      jest.spyOn(handler as any, 'getRetryStrategy').mockReturnValue({ delay: jest.fn().mockResolvedValue(undefined) });

      // fail once, then succeed
      mockStep.execute = jest
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(undefined as any);

      await handler.handleError(new Error('network timeout'), mockStep, mockContext);

      expect(mockStep.execute).toHaveBeenCalledTimes(2);
      // At least one info log should indicate success
      expect(mockLogger.info.mock.calls.some(([msg]) => String(msg).includes('succeeded on retry'))).toBe(true);
    });

    it('retries with linear strategy without real delay', async () => {
      const handler = new ErrorHandler({ maxRetries: 2, retryStrategy: 'linear', fallbackEnabled: true });
      (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
      jest.spyOn(handler as any, 'getRetryStrategy').mockReturnValue({ delay: jest.fn().mockResolvedValue(undefined) });

      mockStep.execute = jest
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(undefined as any);

      await handler.handleError(new Error('network error'), mockStep, mockContext);
      expect(mockStep.execute).toHaveBeenCalledTimes(2);
    });

    it('retries with fixed strategy without real delay', async () => {
      const handler = new ErrorHandler({ maxRetries: 2, retryStrategy: 'fixed', fallbackEnabled: true });
      (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
      jest.spyOn(handler as any, 'getRetryStrategy').mockReturnValue({ delay: jest.fn().mockResolvedValue(undefined) });

      mockStep.execute = jest
        .fn()
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValueOnce(undefined as any);

      await handler.handleError(new Error('timeout'), mockStep, mockContext);
      expect(mockStep.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('fallback mechanisms', () => {
    it('should implement fallback for non-critical failures', async () => {
      const nonCriticalError = new Error('non-critical error');
      nonCriticalError.name = 'NonCriticalError';
      
      await expect(errorHandler.handleError(nonCriticalError, mockStep, mockContext)).resolves.toBeUndefined();
      // Unknown type fallback logs but we ensure no throw
    });
  });
});
