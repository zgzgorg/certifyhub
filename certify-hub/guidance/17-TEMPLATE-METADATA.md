# 模板元数据管理指南

## 概述

模板元数据管理系统是 CertifyHub 的核心功能之一，允许用户为证书模板定义自定义字段、布局和验证规则。该系统支持个人默认设置和公共模板配置。

## 功能特性

### 1. 元数据定义
- **字段配置**: 定义字段名称、类型、验证规则
- **布局控制**: 设置字段位置、字体、颜色、对齐方式
- **显示控制**: 控制字段在预览和生成中的显示
- **默认值**: 设置字段的默认值

### 2. 个人化设置
- **用户默认**: 每个用户可以设置个人默认元数据
- **模板特定**: 为不同模板设置不同的元数据配置
- **继承机制**: 从公共模板继承基础配置

### 3. 公共模板支持
- **默认元数据**: 为公共模板设置默认元数据
- **访问控制**: 控制元数据的访问权限
- **版本管理**: 支持元数据版本控制

## 数据库架构

### 1. 模板元数据表
```sql
CREATE TABLE template_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  metadata JSONB NOT NULL, -- 灵活的JSON结构用于字段定义
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id, is_default) -- 确保每个用户每个模板只有一个默认
);
```

### 2. 元数据结构
```typescript
interface TemplateMetadata {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  user_id: string;
  metadata: TemplateFieldMetadata[];
  created_at: string;
  updated_at: string;
}

interface TemplateFieldMetadata {
  id: string;
  label: string;
  position: { x: number; y: number };
  required: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  showInPreview: boolean;
  defaultValue?: string;
  validation?: {
    type: 'email' | 'phone' | 'date' | 'number' | 'text';
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}
```

## 核心功能实现

### 1. 元数据获取
```typescript
const useTemplateMetadata = (templateId?: string) => {
  const { user } = useAuth();
  const [metadata, setMetadata] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!templateId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('template_metadata')
        .select('*')
        .eq('template_id', templateId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMetadata(data || []);
    } catch (err) {
      console.error('Error fetching template metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
    } finally {
      setLoading(false);
    }
  }, [templateId, user?.id]);

  return { metadata, loading, error, fetchMetadata };
};
```

### 2. 公共元数据获取
```typescript
const getPublicTemplateMetadata = useCallback(async (templateId: string): Promise<TemplateMetadata | null> => {
  if (!templateId) return null;

  try {
    // 获取此模板的任何默认元数据（公共访问）
    const { data, error } = await supabase
      .from('template_metadata')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching public template metadata:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching public template metadata:', err);
    return null;
  }
}, []);
```

### 3. 用户默认元数据获取
```typescript
const getUserDefaultMetadata = useCallback(async (templateId: string): Promise<TemplateMetadata | null> => {
  if (!templateId || !user) return null;

  try {
    const { data, error } = await supabase
      .from('template_metadata')
      .select('*')
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching user default metadata:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching user default metadata:', err);
    return null;
  }
}, [user?.id]);
```

## 元数据编辑器组件

### 1. 编辑器界面
```typescript
const TemplateMetadataEditor: React.FC<TemplateMetadataEditorProps> = ({
  template,
  metadata,
  onSave,
  onCancel
}) => {
  const [fields, setFields] = useState<TemplateFieldMetadata[]>(metadata?.metadata || []);
  const [name, setName] = useState(metadata?.name || '');
  const [description, setDescription] = useState(metadata?.description || '');
  const [isDefault, setIsDefault] = useState(metadata?.is_default || false);

  const handleAddField = () => {
    const newField: TemplateFieldMetadata = {
      id: generateId(),
      label: 'New Field',
      position: { x: 100, y: 100 },
      required: false,
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      textAlign: 'left',
      showInPreview: true
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<TemplateFieldMetadata>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
  };

  const handleSave = async () => {
    const metadataData: TemplateMetadata = {
      id: metadata?.id || '',
      template_id: template.id,
      name,
      description,
      is_default: isDefault,
      user_id: user?.id || '',
      metadata: fields,
      created_at: metadata?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await onSave(metadataData);
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit Template Metadata: {template.name}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Metadata Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            margin="normal"
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
            }
            label="Set as default for this template"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Fields</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddField}
            >
              Add Field
            </Button>
          </Box>

          {fields.map((field, index) => (
            <FieldEditor
              key={field.id}
              field={field}
              onUpdate={(updates) => handleUpdateField(field.id, updates)}
              onDelete={() => handleDeleteField(field.id)}
            />
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Metadata
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 2. 字段编辑器组件
```typescript
const FieldEditor: React.FC<FieldEditorProps> = ({ field, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            label="Field Label"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            size="small"
            sx={{ flexGrow: 1, mr: 2 }}
          />
          
          <IconButton onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          
          <IconButton onClick={onDelete} color="error">
            <DeleteIcon />
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {/* 位置控制 */}
            <TextField
              label="X Position"
              type="number"
              value={field.position.x}
              onChange={(e) => onUpdate({ 
                position: { ...field.position, x: parseInt(e.target.value) }
              })}
              size="small"
            />
            
            <TextField
              label="Y Position"
              type="number"
              value={field.position.y}
              onChange={(e) => onUpdate({ 
                position: { ...field.position, y: parseInt(e.target.value) }
              })}
              size="small"
            />

            {/* 字体设置 */}
            <TextField
              label="Font Size"
              type="number"
              value={field.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              size="small"
            />
            
            <TextField
              label="Font Family"
              value={field.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              size="small"
            />

            {/* 颜色和对齐 */}
            <TextField
              label="Color"
              type="color"
              value={field.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              size="small"
            />
            
            <FormControl size="small">
              <InputLabel>Text Align</InputLabel>
              <Select
                value={field.textAlign}
                onChange={(e) => onUpdate({ textAlign: e.target.value as any })}
                label="Text Align"
              >
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="center">Center</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </Select>
            </FormControl>

            {/* 选项设置 */}
            <FormControlLabel
              control={
                <Switch
                  checked={field.required}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                />
              }
              label="Required"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={field.showInPreview}
                  onChange={(e) => onUpdate({ showInPreview: e.target.checked })}
                />
              }
              label="Show in Preview"
            />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
```

## 元数据应用

### 1. 证书生成中的应用
```typescript
const loadTemplateMetadata = async (templateId: string) => {
  try {
    // 首先尝试获取用户此模板的默认元数据（如果已登录）
    if (user) {
      const userMetadata = await getUserDefaultMetadata(templateId);
      if (userMetadata) {
        // 使用用户的默认元数据
        const metadataFields = userMetadata.metadata.map((field: TemplateFieldMetadata) => ({
          id: field.id,
          label: field.label,
          value: '',
          position: field.position,
          required: field.required,
          fontSize: field.fontSize,
          fontFamily: field.fontFamily,
          color: field.color,
          textAlign: field.textAlign,
          showInPreview: field.showInPreview,
        }));
        setTemplateFields(prev => ({ ...prev, [templateId]: metadataFields }));
        return;
      }
    }

    // 如果没有用户元数据，尝试获取此模板的任何默认元数据（公共访问）
    const anyMetadata = await getPublicTemplateMetadata(templateId);

    if (anyMetadata) {
      // 使用任何可用的默认元数据
      const metadataFields = anyMetadata.metadata.map((field: TemplateFieldMetadata) => ({
        id: field.id,
        label: field.label,
        value: '',
        position: field.position,
        required: field.required,
        fontSize: field.fontSize,
        fontFamily: field.fontFamily,
        color: field.color,
        textAlign: field.textAlign,
        showInPreview: field.showInPreview,
      }));
      setTemplateFields(prev => ({ ...prev, [templateId]: metadataFields }));
      return;
    }

    // 如果没有元数据，使用默认字段
    setTemplateFields(prev => ({ 
      ...prev, 
      [templateId]: getDefaultFields() 
    }));
  } catch (error) {
    console.error('Error loading template metadata:', error);
    // 使用默认字段作为后备
    setTemplateFields(prev => ({ 
      ...prev, 
      [templateId]: getDefaultFields() 
    }));
  }
};
```

### 2. PDF生成中的应用
```typescript
const generatePDFWithMetadata = async (template: Template, metadata: TemplateFieldMetadata[], values: Record<string, string>) => {
  const canvas = await html2canvas(document.getElementById('certificate-preview') as HTMLElement);
  
  // 应用元数据设置
  metadata.forEach(field => {
    const element = document.getElementById(`field-${field.id}`);
    if (element) {
      element.style.fontSize = `${field.fontSize}px`;
      element.style.fontFamily = field.fontFamily;
      element.style.color = field.color;
      element.style.textAlign = field.textAlign;
      element.style.left = `${field.position.x}px`;
      element.style.top = `${field.position.y}px`;
      element.textContent = values[field.id] || '';
    }
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  
  const imgWidth = 297; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  
  return pdf;
};
```

## 数据验证

### 1. 字段验证
```typescript
const validateMetadata = (metadata: TemplateMetadata): ValidationResult => {
  const errors: string[] = [];

  // 检查必需字段
  if (!metadata.name.trim()) {
    errors.push('Metadata name is required');
  }

  if (!metadata.metadata || metadata.metadata.length === 0) {
    errors.push('At least one field is required');
  }

  // 检查字段配置
  metadata.metadata.forEach((field, index) => {
    if (!field.label.trim()) {
      errors.push(`Field ${index + 1}: Label is required`);
    }

    if (field.position.x < 0 || field.position.y < 0) {
      errors.push(`Field ${index + 1}: Position must be positive`);
    }

    if (field.fontSize < 8 || field.fontSize > 72) {
      errors.push(`Field ${index + 1}: Font size must be between 8 and 72`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### 2. 冲突检测
```typescript
const detectFieldConflicts = (fields: TemplateFieldMetadata[]): FieldConflict[] => {
  const conflicts: FieldConflict[] = [];

  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const field1 = fields[i];
      const field2 = fields[j];

      // 检查位置重叠
      const overlap = calculateOverlap(field1.position, field2.position);
      if (overlap > 0.5) { // 50% 重叠阈值
        conflicts.push({
          type: 'POSITION_OVERLAP',
          field1: field1.label,
          field2: field2.label,
          severity: 'warning'
        });
      }

      // 检查重复标签
      if (field1.label.toLowerCase() === field2.label.toLowerCase()) {
        conflicts.push({
          type: 'DUPLICATE_LABEL',
          field1: field1.label,
          field2: field2.label,
          severity: 'error'
        });
      }
    }
  }

  return conflicts;
};
```

## 性能优化

### 1. 缓存策略
```typescript
const metadataCache = new Map<string, TemplateMetadata>();

const getCachedMetadata = async (templateId: string, userId?: string): Promise<TemplateMetadata | null> => {
  const cacheKey = `${templateId}-${userId || 'public'}`;
  
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  const metadata = userId 
    ? await getUserDefaultMetadata(templateId)
    : await getPublicTemplateMetadata(templateId);

  if (metadata) {
    metadataCache.set(cacheKey, metadata);
  }

  return metadata;
};
```

### 2. 批量操作
```typescript
const batchUpdateMetadata = async (updates: TemplateMetadataUpdate[]): Promise<BatchResult> => {
  const results: BatchResult = {
    successful: 0,
    failed: 0,
    errors: []
  };

  // 分批处理更新
  const batchSize = 10;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('template_metadata')
        .upsert(batch.map(update => ({
          id: update.id,
          template_id: update.template_id,
          name: update.name,
          description: update.description,
          is_default: update.is_default,
          user_id: update.user_id,
          metadata: update.metadata,
          updated_at: new Date().toISOString()
        })));

      if (error) throw error;
      results.successful += batch.length;
    } catch (error) {
      results.failed += batch.length;
      results.errors.push({
        batch: i / batchSize,
        error: error.message
      });
    }
  }

  return results;
};
```

## 用户界面

### 1. 模板管理页面
```typescript
const TemplatesPage: React.FC = () => {
  const { user } = useAuth();
  const { templates, loading } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState<TemplateMetadata | null>(null);

  const handleEditMetadata = (template: Template, metadata: TemplateMetadata) => {
    setSelectedTemplate(template);
    setEditingMetadata(metadata);
    setIsMetadataEditorOpen(true);
  };

  const handleMetadataSaved = async (metadata: TemplateMetadata) => {
    if (!selectedTemplate) return;
    
    try {
      if (metadata.id) {
        // 更新现有元数据
        const { error } = await supabase
          .from('template_metadata')
          .update({
            name: metadata.name,
            description: metadata.description,
            is_default: metadata.is_default,
            metadata: metadata.metadata,
          })
          .eq('id', metadata.id);
        if (error) throw error;
      } else {
        // 创建新元数据
        const { error } = await supabase
          .from('template_metadata')
          .insert({
            template_id: selectedTemplate.id,
            name: metadata.name,
            description: metadata.description,
            is_default: metadata.is_default,
            user_id: user?.id,
            metadata: metadata.metadata,
          });
        if (error) throw error;
      }
      
      setIsMetadataEditorOpen(false);
      setSelectedTemplate(null);
      setEditingMetadata(null);
    } catch (error) {
      console.error('Error saving metadata:', error);
      alert('Failed to save metadata');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Template Management
          </h1>

          {loading ? (
            <div className="text-center py-12">
              <CircularProgress />
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEditMetadata={(metadata) => handleEditMetadata(template, metadata)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isMetadataEditorOpen && selectedTemplate && (
        <TemplateMetadataEditor
          template={selectedTemplate}
          metadata={editingMetadata}
          onSave={handleMetadataSaved}
          onCancel={() => {
            setIsMetadataEditorOpen(false);
            setSelectedTemplate(null);
            setEditingMetadata(null);
          }}
        />
      )}
    </div>
  );
};
```

## 测试策略

### 1. 单元测试
```typescript
describe('TemplateMetadata', () => {
  it('should validate metadata correctly', () => {
    const validMetadata: TemplateMetadata = {
      id: '1',
      template_id: 'template-1',
      name: 'Test Metadata',
      is_default: true,
      user_id: 'user-1',
      metadata: [{
        id: 'field-1',
        label: 'Name',
        position: { x: 100, y: 100 },
        required: true,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'left',
        showInPreview: true
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = validateMetadata(validMetadata);
    expect(result.isValid).toBe(true);
  });

  it('should detect field conflicts', () => {
    const fields: TemplateFieldMetadata[] = [
      {
        id: 'field-1',
        label: 'Name',
        position: { x: 100, y: 100 },
        required: true,
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'left',
        showInPreview: true
      },
      {
        id: 'field-2',
        label: 'Name', // 重复标签
        position: { x: 100, y: 100 }, // 重叠位置
        required: false,
        fontSize: 14,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'left',
        showInPreview: true
      }
    ];

    const conflicts = detectFieldConflicts(fields);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
```

### 2. 集成测试
```typescript
describe('TemplateMetadata Integration', () => {
  it('should save and load metadata correctly', async () => {
    const metadata: TemplateMetadata = {
      // ... 测试数据
    };

    // 保存元数据
    const { error: saveError } = await supabase
      .from('template_metadata')
      .insert(metadata);

    expect(saveError).toBeNull();

    // 加载元数据
    const { data, error: loadError } = await supabase
      .from('template_metadata')
      .select('*')
      .eq('id', metadata.id)
      .single();

    expect(loadError).toBeNull();
    expect(data).toEqual(metadata);
  });
});
```

## 故障排除

### 1. 常见问题

#### 元数据加载失败
- 检查用户权限
- 验证模板ID有效性
- 检查数据库连接

#### 字段显示异常
- 检查位置坐标
- 验证字体设置
- 确认显示控制

#### 保存失败
- 检查必填字段
- 验证数据格式
- 确认用户权限

### 2. 调试工具
```typescript
// 调试元数据加载
const debugMetadataLoading = async (templateId: string) => {
  console.log('Loading metadata for template:', templateId);
  
  try {
    const userMetadata = await getUserDefaultMetadata(templateId);
    console.log('User metadata:', userMetadata);
    
    const publicMetadata = await getPublicTemplateMetadata(templateId);
    console.log('Public metadata:', publicMetadata);
  } catch (error) {
    console.error('Metadata loading failed:', error);
  }
};

// 调试字段渲染
const debugFieldRendering = (fields: TemplateFieldMetadata[]) => {
  fields.forEach((field, index) => {
    console.log(`Field ${index + 1}:`, {
      label: field.label,
      position: field.position,
      fontSize: field.fontSize,
      color: field.color,
      showInPreview: field.showInPreview
    });
  });
};
```

## 相关文档

- [模板管理系统](./06-TEMPLATE-SYSTEM.md)
- [PDF生成系统](./07-PDF-GENERATION.md)
- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md)
- [调试指南](./13-DEBUG.md) 