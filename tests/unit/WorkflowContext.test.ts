import { WorkflowContext } from '../../src/core/WorkflowContext';
import { StepOutput } from '../../src/types';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
}));

describe('WorkflowContext', () => {
  let context: WorkflowContext;

  beforeEach(() => {
    context = new WorkflowContext('test-workflow', 3);
  });

  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      expect(context.metadata.workflowId).toBe('test-workflow');
      expect(context.metadata.startTime).toBeNull();
      expect(context.metadata.endTime).toBeNull();
      expect(context.metadata.totalSteps).toBe(3);
      expect(context.metadata.completedSteps).toBe(0);
      expect(context.metadata.failedSteps).toBe(0);
    });

    it('should generate UUID if no workflowId provided', () => {
      const contextWithUUID = new WorkflowContext('', 3);
      expect(contextWithUUID.metadata.workflowId).toBe('test-uuid-1234-5678-9abc-def012345678');
    });
  });

  describe('setData and getData', () => {
    it('should store and retrieve data correctly', () => {
      context.setData('testKey', 'testValue');
      expect(context.getData('testKey')).toBe('testValue');
    });

    it('should return undefined for non-existent key', () => {
      expect(context.getData('nonExistent')).toBeUndefined();
    });

    it('should overwrite existing data', () => {
      context.setData('key', 'value1');
      context.setData('key', 'value2');
      expect(context.getData('key')).toBe('value2');
    });
  });

  describe('setStepOutput and getStepOutput', () => {
    it('should create new step output when none exists', () => {
      const output = { result: 'test' };
      context.setStepOutput('testStep', output);
      
      const stepOutput = context.stepOutputs.get('testStep');
      expect(stepOutput).toBeDefined();
      expect(stepOutput?.output).toBe(output);
      expect(stepOutput?.status).toBe('COMPLETED');
      expect(stepOutput?.startTime).toBeInstanceOf(Date);
      expect(stepOutput?.endTime).toBeInstanceOf(Date);
    });

    it('should update existing step output', () => {
      const initialOutput = { result: 'initial' };
      const updatedOutput = { result: 'updated' };
      
      context.setStepOutput('testStep', initialOutput);
      context.setStepOutput('testStep', updatedOutput);
      
      const stepOutput = context.stepOutputs.get('testStep');
      expect(stepOutput?.output).toEqual(updatedOutput);
    });

    it('should return undefined for non-existent step', () => {
      expect(context.getStepOutput('nonExistent')).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should track errors correctly', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      context.errors.push(error1);
      context.errors.push(error2);
      
      expect(context.errors).toHaveLength(2);
      expect(context.errors[0]).toBe(error1);
      expect(context.errors[1]).toBe(error2);
    });
  });
});
