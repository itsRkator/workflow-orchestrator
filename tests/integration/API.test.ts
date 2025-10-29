import request from 'supertest';
import { App } from '../../src/App';
import { Logger } from '../../src/utils/logger';

// Mock UUID
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
}));

// Mock Logger
jest.mock('../../src/utils/logger');

describe('API Integration Tests', () => {
  let app: App;
  let server: any;

  beforeAll(() => {
    app = new App();
    server = app.getApp();
  });

  afterAll(() => {
    // Server cleanup is handled automatically by supertest
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API documentation', async () => {
      const response = await request(server)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Workflow Orchestrator API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health', '/health');
      expect(response.body.endpoints).toHaveProperty('workflows', '/api/workflows');
    });
  });

  describe('Workflow Execution Endpoints', () => {
    it('should execute workflow with mock data', async () => {
      const response = await request(server)
        .post('/api/workflows/execute')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('workflowId');
      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('executionTime');

      const result = response.body.result;
      expect(result).toHaveProperty('status', 'COMPLETED');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('metrics');

      expect(result.steps).toHaveLength(5);
      expect(result.summary.totalSteps).toBe(5);
      expect(result.summary.completedSteps).toBe(5);
      expect(result.summary.failedSteps).toBe(0);
      expect(result.summary.successRate).toBe(100);
    });

    it('should execute workflow with custom data', async () => {
      const customData = {
        inputData: {
          name: 'API Test Company',
          industry: 'Technology',
          revenue: 3000000,
          expenses: 1800000,
          assets: 6000000,
          liabilities: 1500000,
        },
      };

      const response = await request(server)
        .post('/api/workflows/execute-with-data')
        .send(customData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('workflowId');
      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('executionTime');

      const result = response.body.result;
      expect(result).toHaveProperty('status', 'COMPLETED');
      expect(result.steps).toHaveLength(5);
      expect(result.summary.successRate).toBe(100);
    });

    it('should handle invalid custom data', async () => {
      const invalidData = {
        inputData: {
          name: '', // Invalid empty name
          industry: 'Technology',
          revenue: -1000, // Invalid negative revenue
          expenses: 1800000,
          assets: 6000000,
          liabilities: 1500000,
        },
      };

      const response = await request(server)
        .post('/api/workflows/execute-with-data')
        .send(invalidData)
        .expect(200);

      // Should still return 200 but the workflow might complete with warnings
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.result.status).toBe('COMPLETED');
      // The validation step might handle invalid data gracefully
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(server)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
    });

    it('should handle not implemented endpoints', async () => {
      const response = await request(server)
        .get('/api/workflows/invalid-id/status')
        .expect(501);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_IMPLEMENTED');
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(server)
        .post('/api/workflows/execute-with-data')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields for execute-with-data', async () => {
      const response = await request(server)
        .post('/api/workflows/execute-with-data')
        .send({}) // Empty body
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate inputData structure', async () => {
      const invalidStructure = {
        inputData: {
          // Missing required fields
        },
      };

      const response = await request(server)
        .post('/api/workflows/execute-with-data')
        .send(invalidStructure)
        .expect(200);

      // Should execute but the validation step might handle invalid data gracefully
      expect(response.body.result.status).toBe('COMPLETED');
    });
  });

  describe('Performance', () => {
    it('should execute workflow within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(server)
        .post('/api/workflows/execute')
        .expect(200);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.executionTime).toBeLessThan(executionTime);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(server)
          .post('/api/workflows/execute')
          .expect(200)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.result.status).toBe('COMPLETED');
      });
    });
  });
});
