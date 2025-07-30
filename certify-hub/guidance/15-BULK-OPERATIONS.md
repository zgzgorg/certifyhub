# 批量操作优化

## 概述

批量操作是 CertifyHub 中的核心功能，包括批量证书生成、批量邮件发送和批量数据处理。本文档详细介绍了批量操作的优化策略和实现方案。

## 批量证书生成

### 1. 批量生成架构
```typescript
// 批量证书生成器
class BulkCertificateGenerator {
  private templates: Map<string, string>;
  private dataList: CertificateData[];
  private options: BulkGenerationOptions;
  
  constructor(options: BulkGenerationOptions = {}) {
    this.templates = new Map();
    this.dataList = [];
    this.options = {
      concurrency: 5,
      batchSize: 10,
      retryAttempts: 3,
      ...options
    };
  }
  
  async generateCertificates(): Promise<BulkGenerationResult> {
    const results: BulkGenerationResult = {
      total: this.dataList.length,
      successful: 0,
      failed: 0,
      certificates: [],
      errors: []
    };
    
    // 分批处理
    const batches = this.chunkArray(this.dataList, this.options.batchSize);
    
    for (const batch of batches) {
      const batchResults = await this.processBatch(batch);
      results.successful += batchResults.successful;
      results.failed += batchResults.failed;
      results.certificates.push(...batchResults.certificates);
      results.errors.push(...batchResults.errors);
    }
    
    return results;
  }
  
  private async processBatch(batch: CertificateData[]): Promise<BatchResult> {
    const promises = batch.map(data => 
      this.generateSingleCertificate(data).catch(error => ({
        success: false,
        error,
        data
      }))
    );
    
    const results = await Promise.allSettled(promises);
    return this.processBatchResults(results);
  }
}
```

### 2. 并发控制
```typescript
// 并发控制器
class ConcurrencyController {
  private maxConcurrency: number;
  private running: number = 0;
  private queue: Array<() => Promise<any>> = [];
  
  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
  }
  
  async execute<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrency) {
      // 等待可用槽位
      await this.waitForSlot();
    }
    
    this.running++;
    
    try {
      return await task();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
  
  private async waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      this.queue.push(() => {
        resolve();
        return Promise.resolve();
      });
    });
  }
  
  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const task = this.queue.shift();
      if (task) {
        task();
      }
    }
  }
}

const concurrencyController = new ConcurrencyController(5);
```

### 3. 进度跟踪
```typescript
// 进度跟踪器
class ProgressTracker {
  private total: number;
  private completed: number = 0;
  private onProgress?: (progress: ProgressInfo) => void;
  
  constructor(total: number, onProgress?: (progress: ProgressInfo) => void) {
    this.total = total;
    this.onProgress = onProgress;
  }
  
  update(completed: number, successful: number, failed: number): void {
    this.completed = completed;
    
    const progress: ProgressInfo = {
      completed,
      total: this.total,
      percentage: (completed / this.total) * 100,
      successful,
      failed,
      remaining: this.total - completed
    };
    
    this.onProgress?.(progress);
  }
  
  increment(successful: number = 1, failed: number = 0): void {
    this.update(this.completed + 1, successful, failed);
  }
}
```

## 批量邮件发送

### 1. 邮件队列系统
```typescript
// 邮件队列管理器
class EmailQueueManager {
  private queue: EmailJob[] = [];
  private processing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5秒
  
  addJob(job: EmailJob): void {
    this.queue.push(job);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job) {
        await this.processJob(job);
      }
    }
    
    this.processing = false;
  }
  
  private async processJob(job: EmailJob): Promise<void> {
    let attempts = 0;
    
    while (attempts < this.maxRetries) {
      try {
        await this.sendEmail(job);
        console.log(`邮件发送成功: ${job.to}`);
        return;
      } catch (error) {
        attempts++;
        console.error(`邮件发送失败 (尝试 ${attempts}/${this.maxRetries}):`, error);
        
        if (attempts < this.maxRetries) {
          await this.delay(this.retryDelay * attempts);
        }
      }
    }
    
    console.error(`邮件发送最终失败: ${job.to}`);
  }
  
  private async sendEmail(job: EmailJob): Promise<void> {
    // 实现邮件发送逻辑
    const { to, subject, html } = job;
    
    // 使用邮件服务发送
    await emailService.send({
      to,
      subject,
      html
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. 批量邮件优化
```typescript
// 批量邮件发送器
class BulkEmailSender {
  private emailQueue: EmailQueueManager;
  private concurrencyController: ConcurrencyController;
  
  constructor() {
    this.emailQueue = new EmailQueueManager();
    this.concurrencyController = new ConcurrencyController(10);
  }
  
  async sendBulkEmails(emails: EmailData[]): Promise<BulkEmailResult> {
    const results: BulkEmailResult = {
      total: emails.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    const progressTracker = new ProgressTracker(emails.length, (progress) => {
      console.log(`邮件发送进度: ${progress.percentage.toFixed(1)}%`);
    });
    
    // 分批发送
    const batches = this.chunkArray(emails, 50);
    
    for (const batch of batches) {
      const batchPromises = batch.map(email => 
        this.concurrencyController.execute(() => this.sendSingleEmail(email))
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(result.reason);
        }
      });
      
      progressTracker.update(results.successful + results.failed, results.successful, results.failed);
    }
    
    return results;
  }
  
  private async sendSingleEmail(email: EmailData): Promise<void> {
    const job: EmailJob = {
      to: email.recipientEmail,
      subject: email.subject,
      html: email.html,
      metadata: email.metadata
    };
    
    this.emailQueue.addJob(job);
  }
}
```

## 数据处理优化

### 1. 数据验证和清理
```typescript
// 数据验证器
class DataValidator {
  private rules: ValidationRule[];
  
  constructor(rules: ValidationRule[] = []) {
    this.rules = rules;
  }
  
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const rule of this.rules) {
      const result = rule.validate(data);
      if (!result.valid) {
        errors.push(result.error);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }
}

// 数据清理器
class DataCleaner {
  cleanEmailData(data: any): any {
    return {
      ...data,
      recipientEmail: data.recipientEmail?.toLowerCase().trim(),
      recipientName: data.recipientName?.trim(),
      courseName: data.courseName?.trim(),
      completionDate: this.formatDate(data.completionDate)
    };
  }
  
  private formatDate(date: any): string {
    if (!date) return '';
    
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
}
```

### 2. 内存优化
```typescript
// 内存优化的数据处理
class MemoryOptimizedProcessor {
  private chunkSize: number;
  private maxMemoryUsage: number;
  
  constructor(chunkSize: number = 1000, maxMemoryUsage: number = 100 * 1024 * 1024) {
    this.chunkSize = chunkSize;
    this.maxMemoryUsage = maxMemoryUsage;
  }
  
  async processLargeDataset<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < data.length; i += this.chunkSize) {
      const chunk = data.slice(i, i + this.chunkSize);
      
      // 检查内存使用
      if (this.getMemoryUsage() > this.maxMemoryUsage) {
        await this.garbageCollect();
      }
      
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      // 清理引用
      chunk.length = 0;
    }
    
    return results;
  }
  
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
  
  private async garbageCollect(): Promise<void> {
    // 强制垃圾回收（如果可用）
    if ('gc' in global) {
      (global as any).gc();
    }
    
    // 等待一小段时间让垃圾回收完成
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
```

## 性能监控

### 1. 性能指标收集
```typescript
// 性能监控器
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      const existing = this.metrics.get(operation) || [];
      existing.push(duration);
      this.metrics.set(operation, existing);
    };
  }
  
  getMetrics(): PerformanceMetrics {
    const result: PerformanceMetrics = {};
    
    for (const [operation, times] of this.metrics) {
      result[operation] = {
        count: times.length,
        average: times.reduce((sum, time) => sum + time, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        total: times.reduce((sum, time) => sum + time, 0)
      };
    }
    
    return result;
  }
  
  logMetrics(): void {
    const metrics = this.getMetrics();
    console.table(metrics);
  }
}
```

### 2. 错误处理和重试
```typescript
// 错误处理器
class ErrorHandler {
  private maxRetries: number;
  private retryDelay: number;
  
  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
  
  async withRetry<T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        onError?.(lastError, attempt);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError!;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 用户界面优化

### 1. 进度显示
```typescript
// 进度显示组件
const ProgressDisplay = ({ progress }: { progress: ProgressInfo }) => {
  return (
    <div className="progress-display">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      
      <div className="progress-stats">
        <span>完成: {progress.completed}/{progress.total}</span>
        <span>成功: {progress.successful}</span>
        <span>失败: {progress.failed}</span>
        <span>剩余: {progress.remaining}</span>
      </div>
      
      <div className="progress-percentage">
        {progress.percentage.toFixed(1)}%
      </div>
    </div>
  );
};
```

### 2. 批量操作界面
```typescript
// 批量操作模态框
const BulkOperationModal = ({ 
  operation, 
  data, 
  onComplete 
}: BulkOperationModalProps) => {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<BulkOperationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleStart = async () => {
    setIsProcessing(true);
    
    try {
      const result = await operation.execute(data, (progress) => {
        setProgress(progress);
      });
      
      setResult(result);
      onComplete?.(result);
    } catch (error) {
      console.error('批量操作失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bulk-operation-modal">
      <h2>批量操作</h2>
      
      {!isProcessing && !result && (
        <div className="operation-summary">
          <p>准备处理 {data.length} 个项目</p>
          <button onClick={handleStart}>开始处理</button>
        </div>
      )}
      
      {isProcessing && progress && (
        <ProgressDisplay progress={progress} />
      )}
      
      {result && (
        <div className="operation-result">
          <h3>处理完成</h3>
          <p>总计: {result.total}</p>
          <p>成功: {result.successful}</p>
          <p>失败: {result.failed}</p>
          
          {result.errors.length > 0 && (
            <details>
              <summary>错误详情</summary>
              <ul>
                {result.errors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
```

## 最佳实践

### 1. 批量操作最佳实践
```typescript
// 批量操作配置
const bulkOperationConfig = {
  // 证书生成
  certificateGeneration: {
    concurrency: 3,
    batchSize: 10,
    maxRetries: 3,
    retryDelay: 2000
  },
  
  // 邮件发送
  emailSending: {
    concurrency: 5,
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 5000
  },
  
  // 数据处理
  dataProcessing: {
    chunkSize: 1000,
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    validationEnabled: true
  }
};
```

### 2. 错误处理策略
```typescript
// 错误处理策略
const errorHandlingStrategies = {
  // 继续处理其他项目
  continue: (error: Error, item: any) => {
    console.error(`处理项目失败:`, error);
    return { success: false, error, item };
  },
  
  // 停止处理
  stop: (error: Error) => {
    throw error;
  },
  
  // 重试处理
  retry: (error: Error, item: any, retryCount: number) => {
    if (retryCount < 3) {
      return { retry: true, item, retryCount: retryCount + 1 };
    }
    return { success: false, error, item };
  }
};
```

## 相关文档

- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md)
- [邮件通知系统](./08-EMAIL-SYSTEM.md)
- [PDF生成系统](./07-PDF-GENERATION.md)
- [调试指南](./13-DEBUG.md) 