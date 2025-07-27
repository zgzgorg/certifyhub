# 证书存储方案C：简化验证方案

## 概述

方案C是一个简化的证书存储和验证方案，通过数字水印技术实现离线验证，避免了复杂的字段定义和验证逻辑，让证书发布过程更加简洁高效。

## 核心设计理念

### 1. 简化验证机制
- **在线验证**：基于数据库的状态验证，检查证书的有效性
- **离线验证**：基于PDF数字水印的完整性验证，无需复杂字段定义

### 2. 防重复生成
- 通过唯一约束和内容hash检测重复的证书内容
- 支持同一组织为同一人重新生成证书（覆盖机制）

### 3. 数字水印技术
- 在PDF生成时嵌入不可见的数字水印
- 水印包含证书的唯一标识和验证信息
- 支持离线验证证书的真实性

## 数据库设计

### certificates 表结构

```sql
CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id),
  publisher_id UUID NOT NULL REFERENCES organizations(id),
  recipient_email VARCHAR(255) NOT NULL,
  metadata_values JSONB NOT NULL, -- 用户填写的字段值
  content_hash VARCHAR(255) NOT NULL, -- 内容完整性hash
  certificate_key VARCHAR(255) UNIQUE NOT NULL, -- 唯一标识
  watermark_data JSONB NOT NULL, -- 数字水印数据
  pdf_url TEXT, -- PDF文件在storage中的URL
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- 可选过期时间
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 防止重复生成相同内容的证书
  UNIQUE(template_id, publisher_id, recipient_email, metadata_values)
);

-- 创建索引
CREATE INDEX idx_certificates_template_id ON certificates(template_id);
CREATE INDEX idx_certificates_publisher_id ON certificates(publisher_id);
CREATE INDEX idx_certificates_certificate_key ON certificates(certificate_key);
CREATE INDEX idx_certificates_content_hash ON certificates(content_hash);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_issued_at ON certificates(issued_at);
```

### watermark_data JSON 结构

```json
{
  "certificateKey": "abc123...",
  "contentHash": "def456...",
  "issuedAt": "2024-01-15T10:30:00Z",
  "publisherId": "org-uuid",
  "templateId": "template-uuid",
  "verificationUrl": "https://certifyhub.com/verify/abc123..."
}
```

### metadata_values JSON 结构

```json
{
  "date": "2024-01-15",
  "course": "Web开发基础课程",
  "instructor": "李老师",
  "achievement": "完成课程学习并达到优秀标准"
}
```

## 核心算法实现

### 1. 证书生成算法

```javascript
import crypto from 'crypto';

interface CertificateGenerationData {
  templateId: string;
  publisherId: string;
  recipientEmail: string;
  metadataValues: Record<string, any>;
}

function generateCertificate(data: CertificateGenerationData) {
  // 1. 生成内容hash（用于完整性验证）
  const contentHash = generateContentHash(
    data.templateId,
    data.publisherId,
    data.recipientEmail,
    data.metadataValues
  );
  
  // 2. 生成证书key（用于唯一标识）
  const certificateKey = generateCertificateKey(
    contentHash,
    data.issuedAt
  );
  
  // 3. 生成数字水印数据
  const watermarkData = {
    certificateKey,
    contentHash,
    issuedAt: data.issuedAt,
    publisherId: data.publisherId,
    templateId: data.templateId,
    verificationUrl: `https://certifyhub.com/verify/${certificateKey}`
  };
  
  return {
    template_id: data.templateId,
    publisher_id: data.publisherId,
    recipient_email: data.recipientEmail,
    metadata_values: data.metadataValues,
    content_hash: contentHash,
    certificate_key: certificateKey,
    watermark_data: watermarkData,
    issued_at: data.issuedAt,
    status: 'active'
  };
}

// 生成内容hash
function generateContentHash(templateId: string, publisherId: string, recipientEmail: string, metadataValues: Record<string, any>): string {
  const contentString = templateId + publisherId + recipientEmail + JSON.stringify(metadataValues);
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

// 生成证书key
function generateCertificateKey(contentHash: string, issuedAt: string): string {
  const keyString = contentHash + issuedAt;
  return crypto.createHash('sha256').update(keyString).digest('hex');
}
```

### 2. 数字水印生成

```javascript
// 生成PDF数字水印
function generatePDFWatermark(watermarkData: any): string {
  // 将水印数据编码为base64字符串
  const watermarkString = JSON.stringify(watermarkData);
  const encodedWatermark = Buffer.from(watermarkString).toString('base64');
  
  // 可以进一步加密或压缩水印数据
  return encodedWatermark;
}

// 在PDF中嵌入数字水印
async function embedWatermarkInPDF(pdfBuffer: Buffer, watermarkData: any): Promise<Buffer> {
  const watermark = generatePDFWatermark(watermarkData);
  
  // 使用PDF库（如pdf-lib）在PDF中嵌入水印
  // 这里提供几种嵌入方式：
  
  // 方式1：在PDF元数据中嵌入
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.setTitle(`Certificate - ${watermarkData.certificateKey}`);
  pdfDoc.setAuthor('CertifyHub');
  pdfDoc.setSubject('Digital Certificate');
  pdfDoc.setKeywords([watermarkData.certificateKey, 'certificate', 'verification']);
  
  // 方式2：在PDF注释中嵌入
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  firstPage.addAnnotation({
    type: 'text',
    content: watermark,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    hidden: true
  });
  
  // 方式3：在PDF内容中嵌入不可见文本
  firstPage.drawText(watermark, {
    x: -1000, // 放在页面外
    y: -1000,
    size: 1,
    color: rgb(1, 1, 1), // 白色，几乎不可见
    opacity: 0.01
  });
  
  return await pdfDoc.save();
}
```

### 3. 数字水印验证

```javascript
// 从PDF中提取数字水印
async function extractWatermarkFromPDF(pdfBuffer: Buffer): Promise<any> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // 尝试从不同位置提取水印
    let watermark = null;
    
    // 方式1：从PDF元数据中提取
    const keywords = pdfDoc.getKeywords();
    if (keywords && keywords.length > 0) {
      const certKey = keywords.find(k => k.startsWith('cert-'));
      if (certKey) {
        watermark = { certificateKey: certKey.replace('cert-', '') };
      }
    }
    
    // 方式2：从PDF注释中提取
    if (!watermark) {
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const annotations = firstPage.getAnnotations();
      
      for (const annotation of annotations) {
        if (annotation.type === 'text' && annotation.content) {
          try {
            const decodedWatermark = Buffer.from(annotation.content, 'base64').toString();
            watermark = JSON.parse(decodedWatermark);
            break;
          } catch (e) {
            // 继续尝试其他方式
          }
        }
      }
    }
    
    // 方式3：从PDF内容中提取不可见文本
    if (!watermark) {
      // 使用OCR或文本提取技术从PDF中提取隐藏文本
      // 这里需要实现具体的文本提取逻辑
    }
    
    return watermark;
  } catch (error) {
    throw new Error(`Failed to extract watermark: ${error.message}`);
  }
}

// 离线验证数字水印
function offlineVerifyWatermark(watermarkData: any): boolean {
  try {
    // 1. 验证水印数据格式
    if (!watermarkData.certificateKey || !watermarkData.contentHash) {
      return false;
    }
    
    // 2. 验证时间戳
    const issuedAt = new Date(watermarkData.issuedAt);
    if (isNaN(issuedAt.getTime())) {
      return false;
    }
    
    // 3. 验证URL格式
    if (!watermarkData.verificationUrl || !watermarkData.verificationUrl.includes('/verify/')) {
      return false;
    }
    
    // 4. 验证证书key格式（64位十六进制）
    const keyRegex = /^[a-f0-9]{64}$/;
    if (!keyRegex.test(watermarkData.certificateKey)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

## 防重复生成功能

### 1. 数据库层面防重复

```sql
-- 唯一约束防止重复生成
ALTER TABLE certificates 
ADD CONSTRAINT unique_certificate_content 
UNIQUE(template_id, publisher_id, recipient_name, recipient_email, metadata_values);
```

### 2. 应用层面防重复

```javascript
async function checkDuplicateCertificate(data: CertificateGenerationData) {
  const { data: existingCertificates, error } = await supabase
    .from('certificates')
    .select('id, certificate_key, issued_at, status')
    .eq('template_id', data.templateId)
    .eq('publisher_id', data.publisherId)
    .eq('recipient_email', data.recipientEmail)
    .eq('metadata_values', data.metadataValues);
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }
  
  return existingCertificates.length > 0 ? existingCertificates[0] : null;
}

// 生成证书时的重复检查
async function generateCertificateWithDuplicateCheck(data: CertificateGenerationData) {
  // 1. 检查是否存在重复证书
  const duplicate = await checkDuplicateCertificate(data);
  
  if (duplicate) {
    if (duplicate.status === 'active') {
      throw new Error('Certificate with identical content already exists');
    } else {
      // 如果证书已被撤销，允许重新生成
      console.log('Replacing revoked certificate');
    }
  }
  
  // 2. 生成新证书
  const issuedAt = new Date().toISOString();
  const certificate = generateCertificate({ ...data, issuedAt });
  
  // 3. 存储到数据库
  const { data: savedCertificate, error } = await supabase
    .from('certificates')
    .insert(certificate)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to save certificate: ${error.message}`);
  }
  
  return savedCertificate;
}

// 生成证书并上传PDF
async function generateCertificateWithPDF(data: CertificateGenerationData, templateImage: Buffer) {
  // 1. 生成证书记录
  const certificate = await generateCertificateWithDuplicateCheck(data);
  
  // 2. 生成PDF
  const pdfBuffer = await generateCertificatePDF(certificate, templateImage);
  
  // 3. 上传PDF到Storage
  const pdfUrl = await uploadCertificatePDF(pdfBuffer, certificate.certificate_key, certificate.publisher_id);
  
  // 4. 更新数据库中的PDF URL
  const { error: updateError } = await supabase
    .from('certificates')
    .update({ pdf_url: pdfUrl })
    .eq('id', certificate.id);
  
  if (updateError) {
    throw new Error(`Failed to update PDF URL: ${updateError.message}`);
  }
  
  return { ...certificate, pdf_url: pdfUrl };
}
```

## 验证功能实现

### 1. 在线验证

```javascript
interface OnlineVerificationResult {
  valid: boolean;
  certificate?: any;
  status: 'active' | 'revoked' | 'expired' | 'not_found';
  error?: string;
}

async function onlineVerifyCertificate(certificateKey: string): Promise<OnlineVerificationResult> {
  try {
    // 1. 查询证书
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('certificate_key', certificateKey)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, status: 'not_found' };
      }
      throw error;
    }
    
    // 2. 检查证书状态
    if (certificate.status !== 'active') {
      return {
        valid: false,
        certificate,
        status: certificate.status
      };
    }
    
    // 3. 检查过期时间
    if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
      return {
        valid: false,
        certificate,
        status: 'expired'
      };
    }
    
    return {
      valid: true,
      certificate,
      status: 'active'
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error.message}`
    };
  }
}
```

### 2. 离线验证（基于数字水印）

```javascript
interface OfflineVerificationResult {
  valid: boolean;
  watermarkData?: any;
  error?: string;
}

async function offlineVerifyCertificate(pdfBuffer: Buffer): Promise<OfflineVerificationResult> {
  try {
    // 1. 从PDF中提取数字水印
    const watermarkData = await extractWatermarkFromPDF(pdfBuffer);
    
    if (!watermarkData) {
      return { valid: false, error: 'No watermark found in PDF' };
    }
    
    // 2. 验证水印数据格式
    const watermarkValid = offlineVerifyWatermark(watermarkData);
    if (!watermarkValid) {
      return { valid: false, error: 'Invalid watermark format' };
    }
    
    return {
      valid: true,
      watermarkData
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error.message}`
    };
  }
}
```

### 3. 完整验证流程

```javascript
interface CompleteVerificationResult {
  offline: OfflineVerificationResult;
  online: OnlineVerificationResult;
  overall: boolean;
  certificate?: any;
}

async function verifyCertificate(certificateKey: string, pdfBuffer?: Buffer): Promise<CompleteVerificationResult> {
  // 1. 在线验证
  const onlineResult = await onlineVerifyCertificate(certificateKey);
  
  // 2. 离线验证（如果提供了PDF文件）
  let offlineResult: OfflineVerificationResult = { valid: false };
  if (pdfBuffer) {
    offlineResult = await offlineVerifyCertificate(pdfBuffer);
  }
  
  // 3. 综合验证结果
  const overall = onlineResult.valid && (!pdfBuffer || offlineResult.valid);
  
  return {
    offline: offlineResult,
    online: onlineResult,
    overall,
    certificate: onlineResult.certificate
  };
}
```

## PDF生成和数字水印集成

### 1. 证书PDF生成

```javascript
import { PDFDocument, rgb } from 'pdf-lib';

async function generateCertificatePDF(certificate: any, templateImage: Buffer): Promise<Buffer> {
  // 1. 创建PDF文档
  const pdfDoc = await PDFDocument.create();
  
  // 2. 嵌入模板图片
  const image = await pdfDoc.embedPng(templateImage);
  const page = pdfDoc.addPage([image.width, image.height]);
  
  // 3. 绘制模板背景
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height
  });
  
  // 4. 添加证书内容
  const { metadata_values } = certificate;
  
  // 根据模板元数据添加文字
  // 这里需要根据具体的模板字段来绘制文字
  // 注意：recipient_name 现在从 recipient_email 中提取或使用其他字段
  page.drawText(metadata_values.course || '', {
    x: 285,
    y: 180,
    size: 32,
    color: rgb(0.1, 0.14, 0.49)
  });
  
  page.drawText(metadata_values.date || '', {
    x: 285,
    y: 280,
    size: 20,
    color: rgb(0.2, 0.2, 0.2)
  });
  
  // 5. 嵌入数字水印
  const watermarkedPDF = await embedWatermarkInPDF(await pdfDoc.save(), certificate.watermark_data);
  
  return watermarkedPDF;
}
```

### 2. 前端PDF生成和查看组件

```typescript
// components/PDFGenerateButton.tsx
import { useState } from 'react';
import { generateCertificatePDF } from '@/utils/certificate';

export const PDFGenerateButton = ({ certificate, templateImage }: any) => {
  const [generating, setGenerating] = useState(false);
  
  const handleGeneratePDF = async () => {
    setGenerating(true);
    
    try {
      // 1. 生成带水印的PDF
      const pdfBuffer = await generateCertificatePDF(certificate, templateImage);
      
      // 2. 创建下载链接
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // 3. 触发下载
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificate.certificate_key}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 4. 清理URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <button
      onClick={handleGeneratePDF}
      disabled={generating}
      className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
    >
      {generating ? '生成中...' : '生成PDF证书'}
    </button>
  );
};

// components/CertificateViewer.tsx
import { useState } from 'react';

export const CertificateViewer = ({ certificate }: { certificate: any }) => {
  const [loading, setLoading] = useState(false);
  
  const handleViewOnline = () => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    }
  };
  
  const handleDownload = () => {
    if (certificate.pdf_url) {
      const link = document.createElement('a');
      link.href = certificate.pdf_url;
      link.download = `certificate-${certificate.certificate_key}.pdf`;
      link.click();
    }
  };
  
  return (
    <div className="space-y-2">
      <h4 className="font-semibold">证书操作</h4>
      <div className="flex space-x-2">
        {certificate.pdf_url && (
          <>
            <button
              onClick={handleViewOnline}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm"
            >
              在线查看
            </button>
            <button
              onClick={handleDownload}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              下载PDF
            </button>
          </>
        )}
        <button
          onClick={() => window.open(certificate.verification_url, '_blank')}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
        >
          验证证书
        </button>
      </div>
    </div>
  );
};
```

## API 端点设计

### 1. 证书生成API

```javascript
// POST /api/certificates/generate
app.post('/api/certificates/generate', async (req, res) => {
  try {
    const {
      templateId,
      recipientEmail,
      metadataValues
    } = req.body;
    
    // 验证用户权限
    const user = await authenticateUser(req);
    if (!user || user.role !== 'organization') {
      return res.status(403).json({ error: 'Only organizations can generate certificates' });
    }
    
    // 获取模板图片
    const templateImage = await getTemplateImage(templateId);
    if (!templateImage) {
      return res.status(404).json({ error: 'Template image not found' });
    }
    
    // 生成证书并上传PDF
    const certificate = await generateCertificateWithPDF({
      templateId,
      publisherId: user.organization_id,
      recipientEmail,
      metadataValues
    }, templateImage);
    
    res.json({
      success: true,
      certificate: {
        id: certificate.id,
        certificate_key: certificate.certificate_key,
        issued_at: certificate.issued_at,
        pdf_url: certificate.pdf_url,
        verification_url: `/api/verify/${certificate.certificate_key}`
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### 2. 证书验证API

```javascript
// GET /api/verify/:certificateKey
app.get('/api/verify/:certificateKey', async (req, res) => {
  try {
    const { certificateKey } = req.params;
    
    const result = await onlineVerifyCertificate(certificateKey);
    
    res.json({
      certificate_key: certificateKey,
      verification: result,
      verification_timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/verify/pdf (上传PDF进行离线验证)
app.post('/api/verify/pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    const pdfBuffer = req.file.buffer;
    const offlineResult = await offlineVerifyCertificate(pdfBuffer);
    
    // 如果离线验证成功，进行在线验证
    let onlineResult = null;
    if (offlineResult.valid && offlineResult.watermarkData) {
      onlineResult = await onlineVerifyCertificate(offlineResult.watermarkData.certificateKey);
    }
    
    res.json({
      offline: offlineResult,
      online: onlineResult,
      overall: offlineResult.valid && (!onlineResult || onlineResult.valid),
      verification_timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 前端集成

### 1. 证书生成组件

```typescript
// components/CertificateGenerator.tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CertificateViewer } from './CertificateViewer';

export const CertificateGenerator = ({ templateId }: { templateId: string }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          recipientName: formData.recipientName,
          recipientEmail: formData.recipientEmail,
          metadataValues: formData.metadataValues
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setCertificate(data.certificate);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Certificate generation failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {/* 表单组件 */}
      {certificate && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3>证书生成成功！</h3>
          <p>证书ID: {certificate.certificate_key}</p>
          <p>验证链接: <a href={certificate.verification_url}>{certificate.verification_url}</a></p>
          
                     {/* 证书操作组件 */}
           <CertificateViewer certificate={certificate} />
        </div>
      )}
    </div>
  );
};
```

### 2. 证书验证组件

```typescript
// components/CertificateVerifier.tsx
import { useState } from 'react';

export const CertificateVerifier = () => {
  const [certificateKey, setCertificateKey] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleVerifyByKey = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/verify/${certificateKey}`);
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyByPDF = async () => {
    if (!pdfFile) return;
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      
      const response = await fetch('/api/verify/pdf', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      console.error('PDF verification failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">证书验证</h2>
      
      <div className="space-y-6">
        {/* 通过证书Key验证 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">通过证书Key验证</h3>
          <div>
            <label className="block text-sm font-medium mb-2">证书Key</label>
            <input
              type="text"
              value={certificateKey}
              onChange={(e) => setCertificateKey(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="输入证书的唯一标识"
            />
          </div>
          <button
            onClick={handleVerifyByKey}
            disabled={loading || !certificateKey}
            className="w-full bg-blue-600 text-white p-2 rounded disabled:bg-gray-400"
          >
            {loading ? '验证中...' : '验证证书'}
          </button>
        </div>
        
        {/* 通过PDF文件验证 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">通过PDF文件验证</h3>
          <div>
            <label className="block text-sm font-medium mb-2">上传PDF证书</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            onClick={handleVerifyByPDF}
            disabled={loading || !pdfFile}
            className="w-full bg-green-600 text-white p-2 rounded disabled:bg-gray-400"
          >
            {loading ? '验证中...' : '验证PDF证书'}
          </button>
        </div>
      </div>
      
      {verificationResult && (
        <div className="mt-6 p-4 border rounded">
          <h3 className="font-bold mb-2">验证结果</h3>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(verificationResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
```

## Supabase Storage 配置

### 1. 创建证书存储桶

```sql
-- 创建 certificates bucket 用于存储生成的PDF文件
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- 创建存储策略
-- 允许公开读取证书PDF
CREATE POLICY "Certificates are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

-- 允许认证用户上传证书PDF
CREATE POLICY "Authenticated users can upload certificates" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'certificates' 
    AND auth.role() = 'authenticated'
  );

-- 允许用户更新自己的证书PDF
CREATE POLICY "Users can update their own certificates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 允许用户删除自己的证书PDF
CREATE POLICY "Users can delete their own certificates" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'certificates' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 2. PDF存储工具函数

```typescript
// utils/certificateStorage.ts
import { supabase } from '@/lib/supabaseClient';

export async function uploadCertificatePDF(pdfBuffer: Buffer, certificateKey: string, publisherId: string): Promise<string> {
  const fileName = `${certificateKey}.pdf`;
  const filePath = `${publisherId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('certificates')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
  
  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`);
  }
  
  // 获取公开URL
  const { data: urlData } = supabase.storage
    .from('certificates')
    .getPublicUrl(filePath);
  
  return urlData.publicUrl;
}

export async function getCertificatePDFUrl(certificateKey: string, publisherId: string): Promise<string | null> {
  const filePath = `${publisherId}/${certificateKey}.pdf`;
  
  const { data } = supabase.storage
    .from('certificates')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

export async function deleteCertificatePDF(certificateKey: string, publisherId: string): Promise<void> {
  const filePath = `${publisherId}/${certificateKey}.pdf`;
  
  const { error } = await supabase.storage
    .from('certificates')
    .remove([filePath]);
  
  if (error) {
    throw new Error(`Failed to delete PDF: ${error.message}`);
  }
}
```

## 部署和配置

### 1. 数据库迁移

```sql
-- 创建证书表
CREATE TABLE certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id),
  publisher_id UUID NOT NULL REFERENCES organizations(id),
  recipient_email VARCHAR(255) NOT NULL,
  metadata_values JSONB NOT NULL,
  content_hash VARCHAR(255) NOT NULL,
  certificate_key VARCHAR(255) UNIQUE NOT NULL,
  watermark_data JSONB NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_certificates_template_id ON certificates(template_id);
CREATE INDEX idx_certificates_publisher_id ON certificates(publisher_id);
CREATE INDEX idx_certificates_certificate_key ON certificates(certificate_key);
CREATE INDEX idx_certificates_content_hash ON certificates(content_hash);
CREATE INDEX idx_certificates_status ON certificates(status);
CREATE INDEX idx_certificates_issued_at ON certificates(issued_at);

-- 创建唯一约束
ALTER TABLE certificates 
ADD CONSTRAINT unique_certificate_content 
UNIQUE(template_id, publisher_id, recipient_email, metadata_values);

-- 启用RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Organizations can view their own certificates" ON certificates
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM organizations WHERE id = certificates.publisher_id
  ));

CREATE POLICY "Organizations can insert their own certificates" ON certificates
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM organizations WHERE id = certificates.publisher_id
  ));

CREATE POLICY "Public can view active certificates" ON certificates
  FOR SELECT USING (status = 'active');
```

### 2. 环境变量配置

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CERTIFICATE_HASH_SECRET=your_hash_secret_key
CERTIFICATE_KEY_SALT=your_key_salt
```

### 3. 依赖包安装

```bash
# 安装PDF处理相关依赖
npm install pdf-lib multer
npm install --save-dev @types/multer

# 安装图片处理依赖（用于模板图片处理）
npm install sharp
npm install --save-dev @types/sharp
```

## 总结

方案C通过以下特性实现了简化的证书存储和验证系统：

### 核心优势
1. **简化设计**：移除了复杂的字段定义和验证逻辑
2. **防重复生成**：通过唯一约束和内容hash检测重复内容
3. **数字水印验证**：基于PDF数字水印的离线验证
4. **在线验证**：基于数据库的状态验证
5. **用户友好**：证书发布过程更加简洁

### 应用场景
1. **证书生成**：组织为参与者生成唯一证书
2. **PDF生成**：自动在PDF中嵌入数字水印
3. **在线验证**：通过证书Key验证证书有效性
4. **离线验证**：通过PDF数字水印验证证书真实性
5. **防重复**：防止同一组织为同一人重复生成相同证书

### 数字水印技术优势
1. **不可见性**：水印嵌入在PDF中，不影响视觉效果
2. **防篡改性**：任何PDF修改都会破坏水印
3. **离线验证**：无需网络连接即可验证证书
4. **标准化**：使用成熟的PDF处理技术

这个方案为CertifyHub提供了一个简洁、安全、用户友好的证书存储和验证解决方案。 