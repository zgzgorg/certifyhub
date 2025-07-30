# 证书详情页面指南

## 概述

证书详情页面 (`/certificates/[id]`) 是 CertifyHub 的核心功能之一，为用户提供完整的证书信息查看、验证和管理功能。该页面支持所有用户访问，包括匿名用户。

## 功能特性

### 1. 证书信息展示
- **基本信息**: 证书ID、状态、颁发日期
- **接收者信息**: 邮箱地址、姓名（如果提供）
- **颁发者信息**: 组织名称、Logo、联系方式
- **模板信息**: 模板名称、描述、预览图
- **证书数据**: 所有元数据字段和值
- **验证信息**: 证书密钥、内容哈希、水印数据

### 2. 证书状态管理
- **状态显示**: 活跃、已撤销、已过期
- **状态图标**: 不同状态使用不同颜色和图标
- **状态更新**: 实时状态同步

### 3. PDF 预览和下载
- **PDF 预览**: 内嵌 PDF 查看器
- **下载功能**: 直接下载 PDF 证书
- **公开链接**: 查看公开验证页面

### 4. 操作功能
- **返回列表**: 返回证书列表页面
- **公开验证**: 打开公开验证链接
- **PDF 下载**: 下载证书 PDF 文件

## 页面结构

### 1. 页面布局
```typescript
interface CertificateDetailPageProps {
  certificate: CertificateData;
  template: TemplateData;
  organization: OrganizationData;
}

// 页面结构
<Box>
  {/* 头部导航 */}
  <Header>
    <BackButton />
    <Title />
    <StatusChip />
  </Header>
  
  {/* 主要内容区域 */}
  <Grid>
    {/* 左侧 - 证书信息 */}
    <LeftColumn>
      <CertificateInfoCard />
      <ActionsCard />
    </LeftColumn>
    
    {/* 右侧 - PDF 预览 */}
    <RightColumn>
      <PDFPreviewCard />
    </RightColumn>
  </Grid>
</Box>
```

### 2. 响应式设计
- **桌面端**: 两列布局，信息在左，预览在右
- **平板端**: 单列布局，信息在上，预览在下
- **移动端**: 垂直堆叠，优化触摸操作

## 数据获取

### 1. 证书数据获取
```typescript
const loadCertificateDetails = async (certificateId: string) => {
  try {
    // 获取证书详情
    const { data: certificate, error: certificateError } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (certificateError) {
      throw certificateError;
    }

    // 获取模板信息
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', certificate.template_id)
      .single();

    // 获取颁发者信息
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', certificate.publisher_id)
      .single();

    return { certificate, template, organization };
  } catch (error) {
    console.error('Error loading certificate details:', error);
    throw error;
  }
};
```

### 2. 错误处理
```typescript
const handleLoadError = (error: any) => {
  if (error.code === 'PGRST116') {
    return 'Certificate not found';
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return 'Network connection failed';
  }
  
  return 'Failed to load certificate details';
};
```

## 组件实现

### 1. 证书信息卡片
```typescript
const CertificateInfoCard: React.FC<{ certificate: CertificateData }> = ({ certificate }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Certificate Information
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 接收者信息 */}
          <InfoRow
            icon={<EmailIcon />}
            label="Recipient Email"
            value={certificate.recipient_email}
          />
          
          {/* 颁发日期 */}
          <InfoRow
            icon={<CalendarIcon />}
            label="Issued Date"
            value={<DateDisplay date={certificate.issued_at} />}
          />
          
          {/* 证书密钥 */}
          <InfoRow
            icon={<FingerprintIcon />}
            label="Certificate Key"
            value={
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {certificate.certificate_key}
              </Typography>
            }
          />
          
          {/* 颁发者信息 */}
          {organization && (
            <InfoRow
              icon={<BusinessIcon />}
              label="Issued By"
              value={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {organization.logo_url && (
                    <Avatar src={organization.logo_url} sx={{ width: 24, height: 24 }} />
                  )}
                  <Typography variant="body1">
                    {organization.name}
                  </Typography>
                </Box>
              }
            />
          )}
          
          {/* 证书数据 */}
          {certificate.metadata_values && Object.keys(certificate.metadata_values).length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Certificate Data
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(certificate.metadata_values).map(([key, value]) => (
                  <Chip 
                    key={key}
                    label={`${key}: ${value}`}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 2. 操作卡片
```typescript
const ActionsCard: React.FC<{ certificate: CertificateData }> = ({ certificate }) => {
  const handleDownloadPDF = () => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    }
  };

  const handleViewPublic = () => {
    if (certificate.certificate_key) {
      window.open(`/verify/${certificate.certificate_key}`, '_blank');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {certificate.pdf_url && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadPDF}
              fullWidth
            >
              Download PDF Certificate
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={handleViewPublic}
            fullWidth
          >
            View Public Certificate
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 3. PDF 预览卡片
```typescript
const PDFPreviewCard: React.FC<{ certificate: CertificateData }> = ({ certificate }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Certificate Preview
        </Typography>
        
        {certificate.pdf_url ? (
          <PDFPreview 
            pdfUrl={certificate.pdf_url}
            title="Certificate Preview"
            height={600}
            showControls={true}
          />
        ) : (
          <Paper 
            sx={{ 
              width: '100%', 
              height: 600, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.50'
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No PDF Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This certificate does not have an associated PDF file.
              </Typography>
            </Box>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};
```

## 状态管理

### 1. 加载状态
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [certificate, setCertificate] = useState<CertificateData | null>(null);
const [template, setTemplate] = useState<TemplateData | null>(null);
const [organization, setOrganization] = useState<OrganizationData | null>(null);
```

### 2. 状态更新
```typescript
useEffect(() => {
  if (certificateId) {
    loadCertificateDetails();
  }
}, [certificateId]);

const loadCertificateDetails = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const data = await fetchCertificateData(certificateId);
    setCertificate(data.certificate);
    setTemplate(data.template);
    setOrganization(data.organization);
  } catch (error) {
    setError(handleLoadError(error));
  } finally {
    setLoading(false);
  }
};
```

## 安全考虑

### 1. 访问控制
- **公开访问**: 证书详情页面对所有用户开放
- **数据验证**: 验证证书ID的有效性
- **权限检查**: 检查用户是否有权限查看特定证书

### 2. 数据保护
- **敏感信息**: 不显示敏感的个人信息
- **数据脱敏**: 对某些字段进行脱敏处理
- **访问日志**: 记录页面访问日志

### 3. 错误处理
- **友好错误**: 显示用户友好的错误消息
- **错误日志**: 记录详细的错误信息
- **重试机制**: 提供重试选项

## 性能优化

### 1. 数据加载优化
```typescript
// 并行数据获取
const loadAllData = async (certificateId: string) => {
  const [certificateResult, templateResult, orgResult] = await Promise.allSettled([
    fetchCertificate(certificateId),
    fetchTemplate(certificateId),
    fetchOrganization(certificateId)
  ]);
  
  return {
    certificate: certificateResult.status === 'fulfilled' ? certificateResult.value : null,
    template: templateResult.status === 'fulfilled' ? templateResult.value : null,
    organization: orgResult.status === 'fulfilled' ? orgResult.value : null
  };
};
```

### 2. 缓存策略
- **数据缓存**: 缓存证书数据避免重复请求
- **图片缓存**: 缓存组织Logo和模板预览图
- **PDF缓存**: 缓存PDF文件减少加载时间

### 3. 懒加载
- **PDF预览**: 延迟加载PDF预览组件
- **图片加载**: 使用懒加载优化图片显示
- **组件加载**: 按需加载非关键组件

## 用户体验

### 1. 加载体验
- **骨架屏**: 显示加载骨架屏
- **进度指示**: 显示加载进度
- **错误恢复**: 提供重试和返回选项

### 2. 交互设计
- **响应式**: 适配不同屏幕尺寸
- **触摸友好**: 优化移动端触摸操作
- **键盘导航**: 支持键盘导航

### 3. 可访问性
- **屏幕阅读器**: 支持屏幕阅读器
- **键盘导航**: 完整的键盘导航支持
- **高对比度**: 支持高对比度模式

## 测试策略

### 1. 单元测试
```typescript
describe('CertificateDetailPage', () => {
  it('should display certificate information correctly', () => {
    // 测试证书信息显示
  });
  
  it('should handle loading state', () => {
    // 测试加载状态
  });
  
  it('should handle error state', () => {
    // 测试错误状态
  });
});
```

### 2. 集成测试
```typescript
describe('Certificate Detail Integration', () => {
  it('should load certificate data from API', async () => {
    // 测试API数据加载
  });
  
  it('should handle PDF preview', () => {
    // 测试PDF预览功能
  });
});
```

### 3. 端到端测试
```typescript
describe('Certificate Detail E2E', () => {
  it('should navigate to certificate detail page', () => {
    // 测试页面导航
  });
  
  it('should download PDF certificate', () => {
    // 测试PDF下载
  });
});
```

## 故障排除

### 1. 常见问题

#### 证书未找到
- 检查证书ID是否正确
- 验证证书是否已被删除
- 检查用户权限

#### PDF加载失败
- 检查PDF URL是否有效
- 验证存储权限
- 检查网络连接

#### 数据加载缓慢
- 检查网络连接
- 验证数据库性能
- 检查缓存配置

### 2. 调试工具
```typescript
// 调试证书数据
const debugCertificateData = (certificate: CertificateData) => {
  console.log('Certificate Data:', certificate);
  console.log('Template ID:', certificate.template_id);
  console.log('Publisher ID:', certificate.publisher_id);
  console.log('PDF URL:', certificate.pdf_url);
};

// 调试加载过程
const debugLoadingProcess = async (certificateId: string) => {
  console.log('Loading certificate:', certificateId);
  
  try {
    const data = await loadCertificateDetails(certificateId);
    console.log('Loaded data:', data);
  } catch (error) {
    console.error('Loading failed:', error);
  }
};
```

## 相关文档

- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md)
- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md)
- [PDF生成系统](./07-PDF-GENERATION.md)
- [调试指南](./13-DEBUG.md) 