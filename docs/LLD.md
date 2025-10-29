# LOW-LEVEL DESIGN (LLD) - Workflow Orchestrator

## 1. Detailed Component Design

### 1.1 WorkflowOrchestrator Class

```javascript
class WorkflowOrchestrator {
  constructor(config) {
    this.config = config;
    this.steps = [];
    this.context = new WorkflowContext();
    this.logger = new Logger();
    this.errorHandler = new ErrorHandler();
  }

  // Core Methods
  addStep(step) { /* Add step to workflow */ }
  execute() { /* Execute all steps sequentially */ }
  validateWorkflow() { /* Validate workflow configuration */ }
  getExecutionReport() { /* Generate execution report */ }
}
```

**Key Properties:**
- `config`: Workflow configuration object
- `steps`: Array of workflow steps
- `context`: Shared execution context
- `logger`: Logging instance
- `errorHandler`: Error handling instance

### 1.2 Step Interface

```javascript
class Step {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.status = 'PENDING';
    this.startTime = null;
    this.endTime = null;
    this.error = null;
    this.output = null;
  }

  // Abstract Methods (to be implemented by concrete steps)
  async execute(context) { throw new Error('Must implement execute method'); }
  async validate(input) { throw new Error('Must implement validate method'); }
  async cleanup() { /* Optional cleanup logic */ }
}
```

### 1.3 WorkflowContext Class

```javascript
class WorkflowContext {
  constructor() {
    this.data = new Map();
    this.metadata = {
      workflowId: null,
      startTime: null,
      endTime: null,
      totalSteps: 0,
      completedSteps: 0,
      failedSteps: 0
    };
    this.stepOutputs = new Map();
    this.errors = [];
  }

  // Methods
  setData(key, value) { this.data.set(key, value); }
  getData(key) { return this.data.get(key); }
  setStepOutput(stepName, output) { this.stepOutputs.set(stepName, output); }
  getStepOutput(stepName) { return this.stepOutputs.get(stepName); }
  addError(error) { this.errors.push(error); }
}
```

## 2. Concrete Step Implementations

### 2.1 DataInputStep

```javascript
class DataInputStep extends Step {
  constructor(config) {
    super('DataInput', config);
    this.validator = new DataInputValidator();
  }

  async execute(context) {
    try {
      this.logger.info(`Starting ${this.name} step`);
      
      // Load data from configured source
      const rawData = await this.loadData();
      
      // Validate input data
      const validatedData = await this.validate(rawData);
      
      // Transform data to standard format
      const transformedData = this.transformData(validatedData);
      
      // Store in context
      context.setData('inputData', transformedData);
      context.setStepOutput(this.name, transformedData);
      
      this.status = 'COMPLETED';
      this.output = transformedData;
      
    } catch (error) {
      this.handleError(error, context);
    }
  }

  async loadData() {
    switch (this.config.source.type) {
      case 'file':
        return await this.loadFromFile(this.config.source.path);
      case 'api':
        return await this.loadFromAPI(this.config.source.url);
      case 'mock':
        return this.generateMockData();
      default:
        throw new Error(`Unsupported data source: ${this.config.source.type}`);
    }
  }

  async validate(data) {
    const schema = Joi.object({
      company: Joi.object({
        name: Joi.string().required(),
        industry: Joi.string().required(),
        revenue: Joi.number().positive().required(),
        expenses: Joi.number().positive().required(),
        assets: Joi.number().positive().required(),
        liabilities: Joi.number().positive().required()
      }).required()
    });

    return await schema.validateAsync(data);
  }

  transformData(data) {
    return {
      ...data,
      company: {
        ...data.company,
        netIncome: data.company.revenue - data.company.expenses,
        equity: data.company.assets - data.company.liabilities
      },
      timestamp: new Date().toISOString()
    };
  }
}
```

### 2.2 ValidationStep

```javascript
class ValidationStep extends Step {
  constructor(config) {
    super('Validation', config);
    this.businessRules = new BusinessRuleEngine();
  }

  async execute(context) {
    try {
      this.logger.info(`Starting ${this.name} step`);
      
      const inputData = context.getData('inputData');
      
      // Schema validation
      await this.validateSchema(inputData);
      
      // Business rule validation
      const validationResults = await this.businessRules.validate(inputData);
      
      if (!validationResults.isValid) {
        throw new ValidationError('Business rule validation failed', validationResults.errors);
      }
      
      // Data quality checks
      const qualityScore = await this.checkDataQuality(inputData);
      
      const validationOutput = {
        isValid: true,
        qualityScore: qualityScore,
        validatedData: inputData,
        validationTimestamp: new Date().toISOString()
      };
      
      context.setData('validatedData', validationOutput);
      context.setStepOutput(this.name, validationOutput);
      
      this.status = 'COMPLETED';
      this.output = validationOutput;
      
    } catch (error) {
      this.handleError(error, context);
    }
  }

  async validateSchema(data) {
    const schema = Joi.object({
      company: Joi.object({
        name: Joi.string().min(1).max(100).required(),
        industry: Joi.string().valid('Technology', 'Finance', 'Healthcare', 'Manufacturing').required(),
        revenue: Joi.number().min(0).max(1000000000).required(),
        expenses: Joi.number().min(0).max(1000000000).required(),
        assets: Joi.number().min(0).max(1000000000).required(),
        liabilities: Joi.number().min(0).max(1000000000).required(),
        netIncome: Joi.number().required(),
        equity: Joi.number().required()
      }).required(),
      timestamp: Joi.string().isoDate().required()
    });

    return await schema.validateAsync(data);
  }

  async checkDataQuality(data) {
    let score = 100;
    const issues = [];

    // Check for reasonable financial ratios
    const revenueToExpenseRatio = data.company.revenue / data.company.expenses;
    if (revenueToExpenseRatio < 0.5 || revenueToExpenseRatio > 10) {
      score -= 20;
      issues.push('Unusual revenue to expense ratio');
    }

    // Check for negative equity
    if (data.company.equity < 0) {
      score -= 30;
      issues.push('Negative equity detected');
    }

    // Check for missing critical data
    if (!data.company.name || data.company.name.trim().length === 0) {
      score -= 50;
      issues.push('Missing company name');
    }

    return {
      score: Math.max(0, score),
      issues: issues
    };
  }
}
```

### 2.3 ValuationStep

```javascript
class ValuationStep extends Step {
  constructor(config) {
    super('Valuation', config);
    this.valuationMethods = new Map();
    this.initializeValuationMethods();
  }

  initializeValuationMethods() {
    this.valuationMethods.set('dcf', new DCFValuation());
    this.valuationMethods.set('comparable', new ComparableValuation());
    this.valuationMethods.set('asset', new AssetBasedValuation());
  }

  async execute(context) {
    try {
      this.logger.info(`Starting ${this.name} step`);
      
      const validationOutput = context.getData('validatedData');
      const validatedData = validationOutput.validatedData;
      
      // Execute multiple valuation methods
      const valuations = await this.executeValuationMethods(validatedData);
      
      // Calculate weighted average
      const finalValuation = this.calculateWeightedValuation(valuations);
      
      // Generate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(valuations);
      
      const valuationOutput = {
        valuations: valuations,
        finalValuation: finalValuation,
        confidenceInterval: confidenceInterval,
        methodology: this.config.methodology,
        timestamp: new Date().toISOString()
      };
      
      context.setData('valuationResult', valuationOutput);
      context.setStepOutput(this.name, valuationOutput);
      
      this.status = 'COMPLETED';
      this.output = valuationOutput;
      
    } catch (error) {
      this.handleError(error, context);
    }
  }

  async executeValuationMethods(data) {
    const results = {};
    
    for (const [methodName, method] of this.valuationMethods) {
      try {
        results[methodName] = await method.calculate(data);
      } catch (error) {
        this.logger.warn(`Valuation method ${methodName} failed: ${error.message}`);
        results[methodName] = { error: error.message };
      }
    }
    
    return results;
  }

  calculateWeightedValuation(valuations) {
    const weights = this.config.methodology.weights || {
      dcf: 0.5,
      comparable: 0.3,
      asset: 0.2
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [method, result] of Object.entries(valuations)) {
      if (result.value && !result.error) {
        weightedSum += result.value * weights[method];
        totalWeight += weights[method];
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  calculateConfidenceInterval(valuations) {
    const values = Object.values(valuations)
      .filter(v => v.value && !v.error)
      .map(v => v.value);

    if (values.length === 0) return { min: 0, max: 0, confidence: 0 };

    const sorted = values.sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const confidence = Math.max(0, 100 - ((max - min) / min) * 100);

    return { min, max, confidence };
  }
}
```

### 2.4 OutputStep

```javascript
class OutputStep extends Step {
  constructor(config) {
    super('Output', config);
    this.formatters = new Map();
    this.initializeFormatters();
  }

  initializeFormatters() {
    this.formatters.set('json', new JSONFormatter());
    this.formatters.set('pdf', new PDFFormatter());
    this.formatters.set('csv', new CSVFormatter());
  }

  async execute(context) {
    try {
      this.logger.info(`Starting ${this.name} step`);
      
      const valuationResult = context.getData('valuationResult');
      const validatedData = context.getData('validatedData');
      
      // Generate formatted output
      const formattedOutput = await this.generateFormattedOutput(valuationResult, validatedData);
      
      // Save output to configured destinations
      await this.saveOutput(formattedOutput);
      
      const outputResult = {
        formattedOutput: formattedOutput,
        savedLocations: this.config.destinations,
        timestamp: new Date().toISOString()
      };
      
      context.setData('outputResult', outputResult);
      context.setStepOutput(this.name, outputResult);
      
      this.status = 'COMPLETED';
      this.output = outputResult;
      
    } catch (error) {
      this.handleError(error, context);
    }
  }

  async generateFormattedOutput(valuationResult, validatedData) {
    const output = {
      company: validatedData.validatedData.company,
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

    const formattedOutputs = {};
    
    for (const [format, formatter] of this.formatters) {
      try {
        formattedOutputs[format] = await formatter.format(output);
      } catch (error) {
        this.logger.warn(`Failed to format output as ${format}: ${error.message}`);
      }
    }

    return formattedOutputs;
  }

  async saveOutput(formattedOutput) {
    for (const destination of this.config.destinations) {
      try {
        await this.saveToDestination(formattedOutput, destination);
      } catch (error) {
        this.logger.error(`Failed to save to ${destination.type}: ${error.message}`);
      }
    }
  }
}
```

### 2.5 ReportStep

```javascript
class ReportStep extends Step {
  constructor(config) {
    super('Report', config);
    this.reportGenerator = new ReportGenerator();
  }

  async execute(context) {
    try {
      this.logger.info(`Starting ${this.name} step`);
      
      // Collect all step outputs
      const stepOutputs = this.collectStepOutputs(context);
      
      // Generate execution metrics
      const metrics = this.generateExecutionMetrics(context);
      
      // Create comprehensive report
      const report = await this.reportGenerator.generateReport({
        stepOutputs: stepOutputs,
        metrics: metrics,
        context: context
      });
      
      // Save report
      await this.saveReport(report);
      
      const reportOutput = {
        report: report,
        savedLocation: this.config.outputPath,
        timestamp: new Date().toISOString()
      };
      
      context.setData('finalReport', reportOutput);
      context.setStepOutput(this.name, reportOutput);
      
      this.status = 'COMPLETED';
      this.output = reportOutput;
      
    } catch (error) {
      this.handleError(error, context);
    }
  }

  collectStepOutputs(context) {
    const outputs = {};
    for (const [stepName, output] of context.stepOutputs) {
      outputs[stepName] = {
        status: output.status,
        executionTime: output.endTime - output.startTime,
        output: output.output,
        error: output.error
      };
    }
    return outputs;
  }

  generateExecutionMetrics(context) {
    const totalTime = context.metadata.endTime - context.metadata.startTime;
    const successRate = (context.metadata.completedSteps / context.metadata.totalSteps) * 100;
    
    return {
      totalExecutionTime: totalTime,
      successRate: successRate,
      totalSteps: context.metadata.totalSteps,
      completedSteps: context.metadata.completedSteps,
      failedSteps: context.metadata.failedSteps,
      errors: context.errors
    };
  }
}
```

## 3. Error Handling System

### 3.1 ErrorHandler Class

```javascript
class ErrorHandler {
  constructor(config) {
    this.config = config;
    this.retryStrategies = new Map();
    this.initializeRetryStrategies();
  }

  initializeRetryStrategies() {
    this.retryStrategies.set('exponential', new ExponentialBackoff());
    this.retryStrategies.set('linear', new LinearBackoff());
    this.retryStrategies.set('fixed', new FixedDelay());
  }

  async handleError(error, step, context) {
    const errorInfo = this.classifyError(error);
    
    // Log error
    this.logger.error(`Step ${step.name} failed: ${error.message}`, {
      error: errorInfo,
      step: step.name,
      context: context.metadata
    });

    // Determine retry strategy
    if (this.shouldRetry(errorInfo)) {
      return await this.executeRetry(error, step, context);
    }

    // Execute fallback strategy
    return await this.executeFallback(errorInfo, step, context);
  }

  classifyError(error) {
    if (error instanceof ValidationError) {
      return { type: 'VALIDATION', severity: 'HIGH', retryable: false };
    } else if (error instanceof NetworkError) {
      return { type: 'NETWORK', severity: 'MEDIUM', retryable: true };
    } else if (error instanceof TimeoutError) {
      return { type: 'TIMEOUT', severity: 'MEDIUM', retryable: true };
    } else {
      return { type: 'UNKNOWN', severity: 'HIGH', retryable: false };
    }
  }

  shouldRetry(errorInfo) {
    return errorInfo.retryable && 
           errorInfo.severity !== 'HIGH' && 
           this.config.maxRetries > 0;
  }

  async executeRetry(error, step, context) {
    const strategy = this.retryStrategies.get(this.config.retryStrategy);
    return await strategy.execute(() => step.execute(context), this.config.maxRetries);
  }
}
```

## 4. Logging System

### 4.1 Logger Class

```javascript
class Logger {
  constructor(config) {
    this.config = config;
    this.winston = require('winston');
    this.setupLogger();
  }

  setupLogger() {
    this.logger = this.winston.createLogger({
      level: this.config.level || 'info',
      format: this.winston.format.combine(
        this.winston.format.timestamp(),
        this.winston.format.errors({ stack: true }),
        this.winston.format.json()
      ),
      transports: [
        new this.winston.transports.Console(),
        new this.winston.transports.File({ filename: 'workflow.log' })
      ]
    });
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
}
```

## 5. Configuration Management

### 5.1 Configuration Schema

```javascript
const workflowConfigSchema = Joi.object({
  workflowId: Joi.string().required(),
  name: Joi.string().required(),
  version: Joi.string().required(),
  steps: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
    config: Joi.object().required(),
    dependencies: Joi.array().items(Joi.string()).default([])
  })).min(1).required(),
  errorHandling: Joi.object({
    maxRetries: Joi.number().min(0).default(3),
    retryStrategy: Joi.string().valid('exponential', 'linear', 'fixed').default('exponential'),
    fallbackEnabled: Joi.boolean().default(true)
  }).default({}),
  logging: Joi.object({
    level: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
    enableFileLogging: Joi.boolean().default(true),
    enableConsoleLogging: Joi.boolean().default(true)
  }).default({})
});
```

## 6. API Design

### 6.1 REST API Endpoints

```javascript
// POST /api/workflows/execute
// Execute a workflow with provided configuration
app.post('/api/workflows/execute', async (req, res) => {
  try {
    const workflowConfig = req.body;
    const orchestrator = new WorkflowOrchestrator(workflowConfig);
    const result = await orchestrator.execute();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/workflows/:id/status
// Get workflow execution status
app.get('/api/workflows/:id/status', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const status = await workflowManager.getStatus(workflowId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// GET /api/workflows/:id/report
// Get workflow execution report
app.get('/api/workflows/:id/report', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const report = await workflowManager.getReport(workflowId);
    res.json({ success: true, report });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});
```

## 7. Data Models

### 7.1 Workflow Execution Model

```javascript
class WorkflowExecution {
  constructor(id, config) {
    this.id = id;
    this.config = config;
    this.status = 'PENDING';
    this.startTime = null;
    this.endTime = null;
    this.steps = [];
    this.context = new WorkflowContext();
    this.errors = [];
    this.metrics = {};
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime ? this.endTime - this.startTime : null,
      steps: this.steps.map(step => ({
        name: step.name,
        status: step.status,
        startTime: step.startTime,
        endTime: step.endTime,
        duration: step.endTime ? step.endTime - step.startTime : null,
        error: step.error
      })),
      metrics: this.metrics,
      errors: this.errors
    };
  }
}
```

## 8. Testing Strategy

### 8.1 Unit Tests

```javascript
describe('WorkflowOrchestrator', () => {
  let orchestrator;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      workflowId: 'test-workflow',
      name: 'Test Workflow',
      version: '1.0.0',
      steps: [
        { name: 'DataInput', type: 'DataInputStep', config: {} },
        { name: 'Validation', type: 'ValidationStep', config: {} },
        { name: 'Valuation', type: 'ValuationStep', config: {} }
      ]
    };
    orchestrator = new WorkflowOrchestrator(mockConfig);
  });

  test('should execute workflow successfully', async () => {
    const result = await orchestrator.execute();
    expect(result.status).toBe('COMPLETED');
    expect(result.steps).toHaveLength(3);
  });

  test('should handle step failures gracefully', async () => {
    // Mock step failure
    jest.spyOn(orchestrator.steps[0], 'execute').mockRejectedValue(new Error('Test error'));
    
    const result = await orchestrator.execute();
    expect(result.status).toBe('FAILED');
    expect(result.errors).toHaveLength(1);
  });
});
```

### 8.2 Integration Tests

```javascript
describe('Workflow Integration', () => {
  test('should process complete valuation workflow', async () => {
    const testData = {
      company: {
        name: 'Test Corp',
        industry: 'Technology',
        revenue: 1000000,
        expenses: 600000,
        assets: 2000000,
        liabilities: 500000
      }
    };

    const config = createTestWorkflowConfig(testData);
    const orchestrator = new WorkflowOrchestrator(config);
    
    const result = await orchestrator.execute();
    
    expect(result.status).toBe('COMPLETED');
    expect(result.context.getData('valuationResult')).toBeDefined();
    expect(result.context.getData('finalReport')).toBeDefined();
  });
});
```

This Low-Level Design provides detailed implementation specifications for each component, including class structures, method signatures, error handling strategies, and testing approaches. The design ensures modularity, testability, and maintainability while meeting all the functional and non-functional requirements.
