# PDF生成系统

## 概述

PDF生成系统是 CertifyHub 的核心功能之一，负责将证书模板转换为高质量的PDF文件。系统采用模块化设计，支持多种生成方式和优化策略。

## 系统架构

### 1. 模块化设计
```
┌─────────────────┐
│   PDF生成器     │ ← 核心生成引擎
├─────────────────┤
│   模板渲染器    │ ← HTML/CSS渲染
├─────────────────┤
│   数据处理器    │ ← 变量替换和验证
├─────────────────┤
│   优化器        │ ← 性能和质量优化
└─────────────────┘
```

### 2. 技术栈
- **前端渲染**: html2canvas + jsPDF
- **模板引擎**: 自定义变量替换系统
- **图像处理**: Canvas API
- **文件处理**: Blob API

## 核心组件

### 1. PDF生成器
```typescript
// PDF生成器类
class PDFGenerator {
  private template: string;
  private data: any;
  private options: PDFOptions;
  
  constructor(template: string, data: any, options: PDFOptions = {}) {
    this.template = template;
    this.data = data;
    this.options = {
      format: 'A4',
      orientation: 'landscape',
      quality: 'high',
      ...options
    };
  }
  
  async generate(): Promise<Blob> {
    try {
      // 1. 处理模板
      const processedTemplate = this.processTemplate();
      
      // 2. 渲染HTML
      const canvas = await this.renderToCanvas(processedTemplate);
      
      // 3. 生成PDF
      const pdf = await this.canvasToPDF(canvas);
      
      return pdf;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }
  
  private processTemplate(): string {
    let processed = this.template;
    
    // 替换变量
    Object.keys(this.data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, this.data[key] || '');
    });
    
    return processed;
  }
  
  private async renderToCanvas(html: string): Promise<HTMLCanvasElement> {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    try {
      const canvas = await html2canvas(container, {
        scale: 2, // 提高质量
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      return canvas;
    } finally {
      document.body.removeChild(container);
    }
  }
  
  private async canvasToPDF(canvas: HTMLCanvasElement): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    
    const pdf = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.format
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    return pdf.output('blob');
  }
}
```

### 2. 批量PDF生成器
```typescript
// 批量PDF生成器
class BulkPDFGenerator {
  private templates: Map<string, string>;
  private dataList: any[];
  private options: PDFOptions;
  
  constructor(options: PDFOptions = {}) {
    this.templates = new Map();
    this.dataList = [];
    this.options = options;
  }
  
  addTemplate(id: string, template: string): void {
    this.templates.set(id, template);
  }
  
  addData(data: any): void {
    this.dataList.push(data);
  }
  
  async generateAll(): Promise<Blob[]> {
    const results: Blob[] = [];
    
    for (const data of this.dataList) {
      const template = this.templates.get(data.templateId);
      if (!template) {
        throw new Error(`Template not found: ${data.templateId}`);
      }
      
      const generator = new PDFGenerator(template, data, this.options);
      const pdf = await generator.generate();
      results.push(pdf);
    }
    
    return results;
  }
  
  async generateZIP(): Promise<Blob> {
    const pdfs = await this.generateAll();
    return this.createZIP(pdfs);
  }
  
  private async createZIP(pdfs: Blob[]): Promise<Blob> {
    const JSZip = await import('jszip');
    const zip = new JSZip();
    
    pdfs.forEach((pdf, index) => {
      const fileName = `certificate_${index + 1}.pdf`;
      zip.file(fileName, pdf);
    });
    
    return await zip.generateAsync({ type: 'blob' });
  }
}
```

### 3. 模板渲染器
```typescript
// 模板渲染器
class TemplateRenderer {
  private template: string;
  private data: any;
  
  constructor(template: string, data: any) {
    this.template = template;
    this.data = data;
  }
  
  render(): string {
    let rendered = this.template;
    
    // 基本变量替换
    rendered = this.replaceVariables(rendered);
    
    // 条件渲染
    rendered = this.processConditionals(rendered);
    
    // 循环渲染
    rendered = this.processLoops(rendered);
    
    return rendered;
  }
  
  private replaceVariables(template: string): string {
    let result = template;
    
    Object.keys(this.data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, this.data[key] || '');
    });
    
    return result;
  }
  
  private processConditionals(template: string): string {
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    return template.replace(conditionalRegex, (match, condition, content) => {
      return this.data[condition] ? content : '';
    });
  }
  
  private processLoops(template: string): string {
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    return template.replace(loopRegex, (match, arrayName, content) => {
      const array = this.data[arrayName] || [];
      return array.map(item => {
        let itemContent = content;
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemContent = itemContent.replace(regex, item[key]);
        });
        return itemContent;
      }).join('');
    });
  }
}
```

## 性能优化

### 1. 缓存策略
```typescript
// PDF缓存系统
class PDFCache {
  private cache = new Map<string, Blob>();
  private maxSize = 50;
  
  async get(key: string): Promise<Blob | null> {
    return this.cache.get(key) || null;
  }
  
  set(key: string, value: Blob): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  generateKey(template: string, data: any): string {
    const content = JSON.stringify({ template, data });
    return crypto.createHash('md5').update(content).digest('hex');
  }
}

const pdfCache = new PDFCache();

const generatePDFWithCache = async (template: string, data: any): Promise<Blob> => {
  const key = pdfCache.generateKey(template, data);
  const cached = await pdfCache.get(key);
  
  if (cached) {
    return cached;
  }
  
  const generator = new PDFGenerator(template, data);
  const pdf = await generator.generate();
  
  pdfCache.set(key, pdf);
  return pdf;
};
```

### 2. 并发处理
```typescript
// 并发PDF生成
const generatePDFsConcurrent = async (
  templates: string[],
  dataList: any[],
  concurrency = 3
): Promise<Blob[]> => {
  const results: Blob[] = [];
  const chunks = chunk(dataList, concurrency);
  
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (data, index) => {
      const template = templates[index];
      const generator = new PDFGenerator(template, data);
      return await generator.generate();
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }
  
  return results;
};
```

### 3. 内存优化
```typescript
// 内存优化的PDF生成
class MemoryOptimizedPDFGenerator extends PDFGenerator {
  private cleanupCanvas(canvas: HTMLCanvasElement): void {
    // 释放Canvas内存
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;
  }
  
  async generate(): Promise<Blob> {
    let canvas: HTMLCanvasElement | null = null;
    
    try {
      const processedTemplate = this.processTemplate();
      canvas = await this.renderToCanvas(processedTemplate);
      const pdf = await this.canvasToPDF(canvas);
      return pdf;
    } finally {
      if (canvas) {
        this.cleanupCanvas(canvas);
      }
    }
  }
}
```

## 质量优化

### 1. 图像质量设置
```typescript
// 高质量PDF生成
const highQualityOptions: PDFOptions = {
  format: 'A4',
  orientation: 'landscape',
  quality: 'high',
  scale: 2,
  imageType: 'image/png',
  compression: false
};

const generateHighQualityPDF = async (template: string, data: any): Promise<Blob> => {
  const generator = new PDFGenerator(template, data, highQualityOptions);
  return await generator.generate();
};
```

### 2. 字体处理
```typescript
// 字体加载和嵌入
class FontManager {
  private loadedFonts = new Set<string>();
  
  async loadFont(fontFamily: string, fontUrl: string): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) {
      return;
    }
    
    const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);
    this.loadedFonts.add(fontFamily);
  }
  
  async ensureFontsLoaded(fonts: string[]): Promise<void> {
    const loadPromises = fonts.map(font => this.loadFont(font.family, font.url));
    await Promise.all(loadPromises);
  }
}

const fontManager = new FontManager();
```

### 3. 颜色管理
```typescript
// 颜色配置文件
const colorProfiles = {
  sRGB: {
    red: [0.64, 0.33, 0.03],
    green: [0.30, 0.60, 0.10],
    blue: [0.15, 0.06, 0.79],
    white: [0.95, 1.00, 1.09]
  }
};

const applyColorProfile = (canvas: HTMLCanvasElement, profile: string): void => {
  const context = canvas.getContext('2d');
  if (!context) return;
  
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // 应用颜色转换
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // 颜色空间转换逻辑
    // ... 实现颜色转换算法
  }
  
  context.putImageData(imageData, 0, 0);
};
```

## 错误处理

### 1. 生成错误处理
```typescript
// PDF生成错误处理
class PDFGenerationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'PDFGenerationError';
  }
}

const handlePDFGenerationError = (error: any): PDFGenerationError => {
  if (error.name === 'PDFGenerationError') {
    return error;
  }
  
  // 分类错误类型
  if (error.message.includes('template')) {
    return new PDFGenerationError('模板处理失败', 'TEMPLATE_ERROR', error);
  }
  
  if (error.message.includes('canvas')) {
    return new PDFGenerationError('图像渲染失败', 'RENDER_ERROR', error);
  }
  
  if (error.message.includes('memory')) {
    return new PDFGenerationError('内存不足', 'MEMORY_ERROR', error);
  }
  
  return new PDFGenerationError('PDF生成失败', 'UNKNOWN_ERROR', error);
};
```

### 2. 重试机制
```typescript
// PDF生成重试
const generatePDFWithRetry = async (
  template: string,
  data: any,
  maxRetries = 3
): Promise<Blob> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const generator = new PDFGenerator(template, data);
      return await generator.generate();
    } catch (error) {
      if (attempt === maxRetries) {
        throw handlePDFGenerationError(error);
      }
      
      // 指数退避延迟
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new PDFGenerationError('PDF生成失败', 'MAX_RETRIES_EXCEEDED');
};
```

## 监控和分析

### 1. 性能监控
```typescript
// PDF生成性能监控
class PDFPerformanceMonitor {
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
  
  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [operation, times] of this.metrics) {
      result[operation] = {
        count: times.length,
        average: this.getAverageTime(operation),
        min: Math.min(...times),
        max: Math.max(...times)
      };
    }
    
    return result;
  }
}

const pdfMonitor = new PDFPerformanceMonitor();
```

### 2. 质量分析
```typescript
// PDF质量分析
const analyzePDFQuality = (pdf: Blob): Promise<QualityMetrics> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const metrics: QualityMetrics = {
        fileSize: pdf.size,
        compressionRatio: 0,
        imageQuality: 0,
        textQuality: 0
      };
      
      // 分析PDF质量指标
      // ... 实现质量分析逻辑
      
      resolve(metrics);
    };
    reader.readAsArrayBuffer(pdf);
  });
};
```

## 使用示例

### 1. 单个PDF生成
```typescript
// 生成单个PDF
const generateSinglePDF = async () => {
  const template = `
    <div class="certificate">
      <h1>{{recipient_name}}</h1>
      <p>已完成 {{course_name}} 课程</p>
      <p>完成日期: {{completion_date}}</p>
    </div>
  `;
  
  const data = {
    recipient_name: '张三',
    course_name: 'Web开发基础',
    completion_date: '2024-01-15'
  };
  
  const generator = new PDFGenerator(template, data);
  const pdf = await generator.generate();
  
  // 下载PDF
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'certificate.pdf';
  link.click();
  URL.revokeObjectURL(url);
};
```

### 2. 批量PDF生成
```typescript
// 批量生成PDF
const generateBulkPDFs = async () => {
  const bulkGenerator = new BulkPDFGenerator();
  
  // 添加模板
  bulkGenerator.addTemplate('basic', basicTemplate);
  bulkGenerator.addTemplate('advanced', advancedTemplate);
  
  // 添加数据
  const certificates = [
    { templateId: 'basic', recipient_name: '张三', course_name: 'Web开发' },
    { templateId: 'advanced', recipient_name: '李四', course_name: 'React开发' }
  ];
  
  certificates.forEach(cert => bulkGenerator.addData(cert));
  
  // 生成ZIP文件
  const zip = await bulkGenerator.generateZIP();
  
  // 下载ZIP
  const url = URL.createObjectURL(zip);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'certificates.zip';
  link.click();
  URL.revokeObjectURL(url);
};
```

## 相关文档

- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md)
- [模板管理系统](./06-TEMPLATE-SYSTEM.md)
- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md) 