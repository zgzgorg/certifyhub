# Template Management Features - 模板管理功能

## 已实现的功能

### 1. 模板上传功能
- **支持的文件格式**: JPEG, PNG, GIF, PDF, DOC, DOCX
- **文件大小限制**: 最大10MB
- **上传界面**: 模态框形式，包含：
  - 模板名称输入
  - 描述输入（可选）
  - 文件选择
  - 公开/私有设置
  - 实时验证和错误提示

### 2. 模板管理页面 (`/certificate/templates`)
- **网格布局展示**: 所有用户上传的模板
- **模板卡片信息**:
  - 模板名称和文件名
  - 文件大小和类型
  - 上传时间
  - 公开/私有状态标签
  - 文件类型图标
- **操作功能**:
  - 查看模板（新窗口打开）
  - 复制分享链接
  - 删除模板（带确认对话框）

### 3. 模板分享功能
- **分享URL生成**: 每个模板都有唯一的分享链接
- **公开模板预览**: `/template/[id]` 页面展示公开模板
- **预览页面功能**:
  - 模板信息展示
  - 图片直接预览
  - 文档下载链接
  - 分享链接复制

### 4. 数据库设计
- **templates表结构**:
  ```sql
  - id: UUID主键
  - name: 模板名称
  - description: 描述
  - file_url: Supabase Storage URL
  - file_name: 原始文件名
  - file_size: 文件大小
  - file_type: MIME类型
  - is_public: 公开/私有标志
  - user_id: 用户ID
  - share_url: 分享URL
  - created_at: 创建时间
  - updated_at: 更新时间
  ```

### 5. Supabase Storage配置
- **templates bucket**: 专门存储模板文件
- **访问控制**: 公开读取，认证用户上传
- **文件类型限制**: 只允许指定格式
- **大小限制**: 10MB

### 6. 安全特性
- **文件验证**: 类型和大小检查
- **用户权限**: 只能管理自己的模板
- **公开控制**: 只有公开模板可以被分享
- **Row Level Security**: 数据库级别的权限控制

## 文件结构

```
src/
├── app/
│   ├── certificate/
│   │   └── templates/
│   │       └── page.tsx          # 模板管理页面
│   └── template/
│       └── [id]/
│           └── page.tsx          # 模板预览页面
├── components/
│   ├── TemplateUploadModal.tsx   # 上传模态框
│   └── TemplateCard.tsx          # 模板卡片组件
└── types/
    └── template.ts               # 类型定义
```

## 使用方法

### 上传模板
1. 访问 `/certificate/templates`
2. 点击 "Upload Template" 按钮
3. 填写模板信息并选择文件
4. 选择公开或私有
5. 点击上传

### 管理模板
1. 在模板管理页面查看所有模板
2. 点击 "View Template" 查看完整文件
3. 点击 "Copy Share URL" 复制分享链接
4. 点击 "Delete Template" 删除模板

### 分享模板
1. 将模板设置为公开
2. 复制分享链接
3. 分享给其他人
4. 其他人可以通过链接查看模板

## 技术栈

- **前端**: Next.js 15, React, TypeScript
- **样式**: Tailwind CSS
- **后端**: Supabase
- **存储**: Supabase Storage
- **数据库**: PostgreSQL (via Supabase)

## 下一步改进

1. **图片优化**: 使用Next.js Image组件优化图片加载
2. **批量操作**: 支持批量删除和下载
3. **搜索功能**: 按名称和类型搜索模板
4. **分类标签**: 为模板添加分类和标签
5. **版本控制**: 支持模板版本管理
6. **使用统计**: 显示模板使用次数和下载统计 