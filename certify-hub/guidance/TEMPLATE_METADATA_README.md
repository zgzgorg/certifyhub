# Template Metadata 功能说明

## 概述

Template Metadata 功能允许用户为证书模板创建和管理文字框配置信息，包括字段名称、字体、大小、颜色、对齐方式、可见性以及位置等。

## 数据库结构

### template_metadata 表

```sql
CREATE TABLE template_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  user_id UUID NOT NULL,
  metadata JSONB NOT NULL, -- 灵活的JSON结构存储字段定义
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, user_id, is_default) -- 确保每个用户每个模板只有一个默认配置
);
```

### 字段说明

- `template_id`: 关联的模板ID
- `name`: 元数据配置名称
- `description`: 配置描述（可选）
- `is_default`: 是否为默认配置
- `user_id`: 创建者用户ID
- `metadata`: JSON格式的字段配置信息

### metadata JSON 结构

```json
[
  {
    "id": "field-uuid",
    "label": "字段名称",
    "position": { "x": 100, "y": 200 },
    "required": false,
    "showInPreview": true,
    "fontSize": 20,
    "fontFamily": "serif",
    "color": "#1a237e",
    "textAlign": "center"
  }
]
```

## 功能特性

### 1. 创建和编辑 Metadata
- 用户可以为自己的模板创建多个metadata配置
- 支持字段的增删改查
- 实时预览功能

### 2. 默认配置管理
- 每个用户可以为每个模板设置一个默认配置
- 设置新的默认配置会自动取消之前的默认配置

### 3. 权限控制
- 只有模板创建者可以管理该模板的metadata
- 其他用户可以fork模板创建自己的metadata配置（待实现）

### 4. 字段配置
- 字段名称
- 字体大小（1-200px）
- 字体族（serif, sans-serif等）
- 文字颜色
- 对齐方式（左对齐、居中、右对齐）
- 可见性控制
- 位置坐标（x, y）

## 使用方法

### 1. 访问模板管理页面
导航到 `/certificate/templates` 页面

### 2. 管理 Metadata
点击模板卡片上的 "Manage Metadata" 按钮

### 3. 创建新配置
- 输入配置名称和描述
- 添加和配置字段
- 设置是否为默认配置
- 保存配置

### 4. 编辑现有配置
- 选择要编辑的配置
- 修改字段设置
- 保存更改

## 技术实现

### 前端组件
- `TemplateMetadataEditor`: 主要的编辑界面
- `FieldEditor`: 字段编辑组件
- `CertificatePreview`: 预览组件

### Hooks
- `useTemplateMetadata`: 管理metadata的CRUD操作

### 类型定义
- `TemplateMetadata`: 元数据配置类型
- `TemplateFieldMetadata`: 字段配置类型

## 扩展性

### 1. JSON格式的灵活性
metadata字段使用JSONB格式，可以轻松添加新的字段属性而不需要修改数据库结构。

### 2. 多用户支持
当前实现支持模板创建者管理metadata，未来可以扩展支持：
- 其他用户fork模板的metadata
- 共享metadata配置
- 版本控制

### 3. 高级功能
可以进一步扩展：
- 字段验证规则
- 条件显示逻辑
- 模板变量支持
- 批量操作

## 部署说明

1. 运行数据库迁移脚本：
```sql
-- 在Supabase SQL编辑器中运行
\i create-template-metadata.sql
```

2. 确保前端代码已更新并部署

3. 测试功能是否正常工作

## 注意事项

1. 确保数据库中的`update_updated_at_column()`函数已存在
2. 检查RLS策略是否正确配置
3. 验证外键约束是否正常工作
4. 测试默认配置的唯一性约束 