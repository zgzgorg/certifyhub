# 模板管理系统

## 概述

模板管理系统是 CertifyHub 的核心功能之一，允许用户创建、管理和使用证书模板。系统支持 HTML/CSS 模板、元数据管理和模板版本控制。

## 功能特性

### 1. 模板创建
- **HTML/CSS 编辑器**: 可视化模板编辑
- **拖拽界面**: 直观的模板设计
- **实时预览**: 即时查看模板效果
- **响应式设计**: 支持多种设备显示

### 2. 模板管理
- **模板库**: 集中管理所有模板
- **分类系统**: 按类型和用途分类
- **搜索功能**: 快速查找模板
- **版本控制**: 模板版本历史

### 3. 元数据管理
- **动态字段**: 支持变量替换
- **字段验证**: 数据类型和格式验证
- **默认值**: 设置字段默认值
- **必填字段**: 标记必需字段

## 数据库设计

### 1. 模板表结构
```sql
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  css_content TEXT,
  metadata_schema JSONB,
  created_by UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  is_public BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 元数据模式
```json
{
  "fields": [
    {
      "name": "recipient_name",
      "label": "接收者姓名",
      "type": "text",
      "required": true,
      "default": "",
      "validation": {
        "minLength": 1,
        "maxLength": 100
      }
    },
    {
      "name": "course_name",
      "label": "课程名称",
      "type": "text",
      "required": true,
      "default": "",
      "validation": {
        "minLength": 1,
        "maxLength": 200
      }
    },
    {
      "name": "completion_date",
      "label": "完成日期",
      "type": "date",
      "required": true,
      "default": "",
      "validation": {
        "format": "YYYY-MM-DD"
      }
    },
    {
      "name": "score",
      "label": "成绩",
      "type": "number",
      "required": false,
      "default": "",
      "validation": {
        "min": 0,
        "max": 100
      }
    }
  ],
  "layout": {
    "orientation": "landscape",
    "size": "A4",
    "margins": {
      "top": "20mm",
      "bottom": "20mm",
      "left": "20mm",
      "right": "20mm"
    }
  }
}
```

## 用户界面

### 1. 模板编辑器
```typescript
// 模板编辑器组件
const TemplateEditor = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [metadataSchema, setMetadataSchema] = useState({});
  
  return (
    <div className="template-editor">
      <div className="editor-tabs">
        <TabList>
          <Tab>HTML</Tab>
          <Tab>CSS</Tab>
          <Tab>元数据</Tab>
          <Tab>预览</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <CodeEditor
              value={htmlContent}
              onChange={setHtmlContent}
              language="html"
            />
          </TabPanel>
          
          <TabPanel>
            <CodeEditor
              value={cssContent}
              onChange={setCssContent}
              language="css"
            />
          </TabPanel>
          
          <TabPanel>
            <MetadataEditor
              schema={metadataSchema}
              onChange={setMetadataSchema}
            />
          </TabPanel>
          
          <TabPanel>
            <TemplatePreview
              html={htmlContent}
              css={cssContent}
              metadata={metadataSchema}
            />
          </TabPanel>
        </TabPanels>
      </div>
    </div>
  );
};
```

### 2. 元数据编辑器
```typescript
// 元数据编辑器组件
const MetadataEditor = ({ schema, onChange }) => {
  const [fields, setFields] = useState(schema.fields || []);
  
  const addField = () => {
    const newField = {
      name: `field_${fields.length + 1}`,
      label: `字段 ${fields.length + 1}`,
      type: 'text',
      required: false,
      default: '',
      validation: {}
    };
    
    setFields([...fields, newField]);
    onChange({ ...schema, fields: [...fields, newField] });
  };
  
  const updateField = (index: number, field: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = field;
    setFields(updatedFields);
    onChange({ ...schema, fields: updatedFields });
  };
  
  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    onChange({ ...schema, fields: updatedFields });
  };
  
  return (
    <div className="metadata-editor">
      <div className="editor-header">
        <h3>元数据字段</h3>
        <button onClick={addField}>添加字段</button>
      </div>
      
      <div className="fields-list">
        {fields.map((field, index) => (
          <FieldEditor
            key={index}
            field={field}
            onChange={(updatedField) => updateField(index, updatedField)}
            onRemove={() => removeField(index)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 3. 模板预览
```typescript
// 模板预览组件
const TemplatePreview = ({ html, css, metadata }) => {
  const [previewData, setPreviewData] = useState({});
  
  // 生成预览数据
  useEffect(() => {
    const data = {};
    metadata.fields?.forEach(field => {
      data[field.name] = field.default || `示例${field.label}`;
    });
    setPreviewData(data);
  }, [metadata]);
  
  const renderTemplate = () => {
    let renderedHtml = html;
    
    // 替换模板变量
    Object.keys(previewData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedHtml = renderedHtml.replace(regex, previewData[key]);
    });
    
    return (
      <div 
        className="template-preview"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
        style={{ 
          background: 'white',
          padding: '20px',
          border: '1px solid #ddd'
        }}
      />
    );
  };
  
  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>模板预览</h3>
        <button onClick={() => window.print()}>打印预览</button>
      </div>
      
      <div className="preview-content">
        <style>{css}</style>
        {renderTemplate()}
      </div>
    </div>
  );
};
```

## 模板功能

### 1. 模板变量系统
```typescript
// 模板变量处理
const processTemplateVariables = (template: string, data: any): string => {
  let processed = template;
  
  // 处理基本变量 {{variable_name}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, data[key] || '');
  });
  
  // 处理条件语句 {{#if condition}}...{{/if}}
  processed = processConditionals(processed, data);
  
  // 处理循环语句 {{#each items}}...{{/each}}
  processed = processLoops(processed, data);
  
  return processed;
};

const processConditionals = (template: string, data: any): string => {
  const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
  
  return template.replace(conditionalRegex, (match, condition, content) => {
    return data[condition] ? content : '';
  });
};

const processLoops = (template: string, data: any): string => {
  const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
  
  return template.replace(loopRegex, (match, arrayName, content) => {
    const array = data[arrayName] || [];
    return array.map(item => {
      let itemContent = content;
      Object.keys(item).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        itemContent = itemContent.replace(regex, item[key]);
      });
      return itemContent;
    }).join('');
  });
};
```

### 2. 模板验证
```typescript
// 模板验证
const validateTemplate = (template: any): ValidationResult => {
  const errors: string[] = [];
  
  // 验证HTML内容
  if (!template.html_content || template.html_content.trim() === '') {
    errors.push('HTML内容不能为空');
  }
  
  // 验证模板名称
  if (!template.name || template.name.trim() === '') {
    errors.push('模板名称不能为空');
  }
  
  // 验证元数据模式
  if (template.metadata_schema) {
    const schemaErrors = validateMetadataSchema(template.metadata_schema);
    errors.push(...schemaErrors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateMetadataSchema = (schema: any): string[] => {
  const errors: string[] = [];
  
  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push('元数据字段必须是数组');
    return errors;
  }
  
  schema.fields.forEach((field: any, index: number) => {
    if (!field.name || field.name.trim() === '') {
      errors.push(`字段 ${index + 1}: 字段名称不能为空`);
    }
    
    if (!field.label || field.label.trim() === '') {
      errors.push(`字段 ${index + 1}: 字段标签不能为空`);
    }
    
    if (!field.type || !['text', 'number', 'date', 'email'].includes(field.type)) {
      errors.push(`字段 ${index + 1}: 无效的字段类型`);
    }
  });
  
  return errors;
};
```

### 3. 模板版本控制
```typescript
// 模板版本管理
const TemplateVersionManager = () => {
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  
  const createVersion = (template: any) => {
    const newVersion = {
      id: generateUUID(),
      version: currentVersion + 1,
      template: { ...template },
      created_at: new Date().toISOString(),
      created_by: getCurrentUserId()
    };
    
    setVersions([...versions, newVersion]);
    setCurrentVersion(newVersion.version);
    
    return newVersion;
  };
  
  const restoreVersion = (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setCurrentVersion(version.version);
      return version.template;
    }
    return null;
  };
  
  return (
    <div className="version-manager">
      <h3>版本历史</h3>
      <div className="versions-list">
        {versions.map(version => (
          <div key={version.id} className="version-item">
            <span>版本 {version.version}</span>
            <span>{formatDate(version.created_at)}</span>
            <button onClick={() => restoreVersion(version.id)}>
              恢复此版本
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## API 接口

### 1. 模板 CRUD 操作
```typescript
// 模板 API 路由
// GET /api/templates - 获取模板列表
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .ilike('name', `%${search}%`)
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data, page, limit });
}

// POST /api/templates - 创建模板
export async function POST(request: Request) {
  const template = await request.json();
  
  // 验证模板
  const validation = validateTemplate(template);
  if (!validation.isValid) {
    return Response.json({ 
      error: '模板验证失败', 
      details: validation.errors 
    }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from('templates')
    .insert([template])
    .select()
    .single();
    
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data });
}

// PUT /api/templates/[id] - 更新模板
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const template = await request.json();
  
  const { data, error } = await supabase
    .from('templates')
    .update(template)
    .eq('id', params.id)
    .select()
    .single();
    
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ data });
}

// DELETE /api/templates/[id] - 删除模板
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', params.id);
    
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  return Response.json({ success: true });
}
```

### 2. 模板搜索和筛选
```typescript
// 模板搜索功能
const searchTemplates = async (query: string, filters: any) => {
  let queryBuilder = supabase
    .from('templates')
    .select('*');
  
  // 文本搜索
  if (query) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
  }
  
  // 筛选条件
  if (filters.isPublic !== undefined) {
    queryBuilder = queryBuilder.eq('is_public', filters.isPublic);
  }
  
  if (filters.organizationId) {
    queryBuilder = queryBuilder.eq('organization_id', filters.organizationId);
  }
  
  if (filters.createdBy) {
    queryBuilder = queryBuilder.eq('created_by', filters.createdBy);
  }
  
  const { data, error } = await queryBuilder;
  
  if (error) throw error;
  return data;
};
```

## 性能优化

### 1. 模板缓存
```typescript
// 模板缓存系统
class TemplateCache {
  private cache = new Map<string, any>();
  private maxSize = 100;
  
  get(key: string): any {
    return this.cache.get(key);
  }
  
  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const templateCache = new TemplateCache();

const getTemplateWithCache = async (id: string) => {
  const cached = templateCache.get(id);
  if (cached) return cached;
  
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  templateCache.set(id, data);
  return data;
};
```

### 2. 模板预加载
```typescript
// 模板预加载
const preloadTemplates = async (templateIds: string[]) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .in('id', templateIds);
    
  if (error) throw error;
  
  data.forEach(template => {
    templateCache.set(template.id, template);
  });
  
  return data;
};
```

## 相关文档

- [证书系统架构](./04-CERTIFICATE-ARCHITECTURE.md)
- [PDF生成系统](./07-PDF-GENERATION.md)
- [证书颁发功能](./05-CERTIFICATE-ISSUANCE.md) 