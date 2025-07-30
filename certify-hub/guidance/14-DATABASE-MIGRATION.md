# 数据库迁移指南

## 概述

数据库迁移是 CertifyHub 项目维护的重要组成部分，用于管理数据库结构的版本控制和变更。本文档详细介绍了迁移策略、工具和最佳实践。

## 迁移策略

### 1. 版本控制
```sql
-- 创建迁移版本表
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);
```

### 2. 迁移类型
- **结构迁移**: 表结构、索引、约束的变更
- **数据迁移**: 数据转换、清理、导入
- **策略迁移**: RLS策略、权限的变更
- **存储迁移**: 存储桶、文件的变更

## 迁移工具

### 1. 手动迁移
```sql
-- 迁移脚本模板
BEGIN;

-- 1. 创建新表或修改现有表
CREATE TABLE IF NOT EXISTS new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 迁移数据
INSERT INTO new_table (name)
SELECT name FROM old_table;

-- 3. 更新索引
CREATE INDEX idx_new_table_name ON new_table(name);

-- 4. 记录迁移版本
INSERT INTO schema_migrations (version, description)
VALUES ('001_create_new_table', '创建新表');

COMMIT;
```

### 2. 自动化迁移
```typescript
// 迁移管理器
class MigrationManager {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  async runMigration(version: string, migration: () => Promise<void>) {
    try {
      // 检查是否已应用
      const { data: existing } = await this.supabase
        .from('schema_migrations')
        .select('version')
        .eq('version', version)
        .single();
        
      if (existing) {
        console.log(`迁移 ${version} 已应用`);
        return;
      }
      
      // 执行迁移
      await migration();
      
      // 记录迁移
      await this.supabase
        .from('schema_migrations')
        .insert([{ version, description: `Migration ${version}` }]);
        
      console.log(`迁移 ${version} 成功应用`);
    } catch (error) {
      console.error(`迁移 ${version} 失败:`, error);
      throw error;
    }
  }
  
  async getAppliedMigrations(): Promise<string[]> {
    const { data } = await this.supabase
      .from('schema_migrations')
      .select('version')
      .order('applied_at');
      
    return data?.map(m => m.version) || [];
  }
}
```

## 常见迁移场景

### 1. 添加新表
```sql
-- 迁移: 添加证书模板表
BEGIN;

-- 创建模板表
CREATE TABLE IF NOT EXISTS certificate_templates (
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

-- 创建索引
CREATE INDEX idx_certificate_templates_created_by ON certificate_templates(created_by);
CREATE INDEX idx_certificate_templates_organization_id ON certificate_templates(organization_id);
CREATE INDEX idx_certificate_templates_is_public ON certificate_templates(is_public);

-- 启用RLS
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Users can view public templates" ON certificate_templates
FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own templates" ON certificate_templates
FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create templates" ON certificate_templates
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own templates" ON certificate_templates
FOR UPDATE USING (created_by = auth.uid());

-- 记录迁移
INSERT INTO schema_migrations (version, description)
VALUES ('002_create_certificate_templates', '创建证书模板表');

COMMIT;
```

### 2. 修改现有表
```sql
-- 迁移: 为用户表添加角色字段
BEGIN;

-- 添加角色枚举类型
CREATE TYPE user_role AS ENUM (
  'anonymous',
  'user',
  'organization',
  'admin',
  'system_admin'
);

-- 添加角色字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 创建索引
CREATE INDEX idx_users_role ON users(role);

-- 更新现有用户角色
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- 记录迁移
INSERT INTO schema_migrations (version, description)
VALUES ('003_add_user_roles', '为用户表添加角色字段');

COMMIT;
```

### 3. 数据迁移
```sql
-- 迁移: 数据清理和转换
BEGIN;

-- 清理无效数据
DELETE FROM certificates 
WHERE template_id IS NULL 
OR publisher_id IS NULL;

-- 更新数据格式
UPDATE certificates 
SET metadata_values = jsonb_set(
  metadata_values, 
  '{migrated}', 
  'true'::jsonb
)
WHERE metadata_values IS NOT NULL;

-- 记录迁移
INSERT INTO schema_migrations (version, description)
VALUES ('004_clean_certificate_data', '清理证书数据');

COMMIT;
```

### 4. 索引优化
```sql
-- 迁移: 优化查询性能
BEGIN;

-- 创建复合索引
CREATE INDEX idx_certificates_template_publisher ON certificates(template_id, publisher_id);
CREATE INDEX idx_certificates_status_issued ON certificates(status, issued_at);

-- 分析表统计信息
ANALYZE certificates;
ANALYZE templates;
ANALYZE organizations;

-- 记录迁移
INSERT INTO schema_migrations (version, description)
VALUES ('005_optimize_indexes', '优化数据库索引');

COMMIT;
```

## 回滚策略

### 1. 回滚脚本
```sql
-- 回滚: 删除证书模板表
BEGIN;

-- 删除相关数据
DELETE FROM certificates WHERE template_id IN (
  SELECT id FROM certificate_templates
);

-- 删除表
DROP TABLE IF EXISTS certificate_templates;

-- 删除迁移记录
DELETE FROM schema_migrations WHERE version = '002_create_certificate_templates';

COMMIT;
```

### 2. 回滚管理器
```typescript
// 回滚管理器
class RollbackManager {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }
  
  async rollbackMigration(version: string, rollback: () => Promise<void>) {
    try {
      // 检查是否已应用
      const { data: existing } = await this.supabase
        .from('schema_migrations')
        .select('version')
        .eq('version', version)
        .single();
        
      if (!existing) {
        console.log(`迁移 ${version} 未应用，无需回滚`);
        return;
      }
      
      // 执行回滚
      await rollback();
      
      // 删除迁移记录
      await this.supabase
        .from('schema_migrations')
        .delete()
        .eq('version', version);
        
      console.log(`迁移 ${version} 成功回滚`);
    } catch (error) {
      console.error(`回滚 ${version} 失败:`, error);
      throw error;
    }
  }
}
```

## 迁移最佳实践

### 1. 迁移命名规范
```typescript
// 迁移文件命名规范
const migrationFiles = [
  '001_initial_schema.sql',
  '002_add_user_roles.sql',
  '003_create_certificate_templates.sql',
  '004_add_certificate_verification.sql',
  '005_optimize_performance.sql'
];

// 版本号格式: YYYYMMDD_HHMMSS_description
const timestampedMigrations = [
  '20240101_120000_initial_schema.sql',
  '20240101_130000_add_user_roles.sql',
  '20240101_140000_create_templates.sql'
];
```

### 2. 迁移测试
```typescript
// 迁移测试
const testMigration = async (migration: () => Promise<void>) => {
  // 创建测试数据库
  const testSupabase = createClient(testUrl, testKey);
  
  try {
    // 运行迁移
    await migration();
    
    // 验证迁移结果
    const { data: tables } = await testSupabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    console.log('迁移测试成功:', tables);
  } catch (error) {
    console.error('迁移测试失败:', error);
    throw error;
  } finally {
    // 清理测试数据
    await cleanupTestData();
  }
};
```

### 3. 迁移验证
```sql
-- 迁移验证脚本
-- 检查表是否存在
SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM (
  VALUES 
    ('users'),
    ('organizations'),
    ('certificates'),
    ('templates'),
    ('certificate_verifications')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_name = expected_tables.table_name 
  AND t.table_schema = 'public';

-- 检查索引是否存在
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 检查RLS策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 生产环境迁移

### 1. 迁移计划
```typescript
// 生产环境迁移计划
const productionMigrationPlan = {
  preMigration: [
    '备份数据库',
    '通知用户维护时间',
    '准备回滚计划'
  ],
  migration: [
    '停止应用服务',
    '执行迁移脚本',
    '验证数据完整性',
    '重启应用服务'
  ],
  postMigration: [
    '监控系统性能',
    '验证功能正常',
    '通知用户迁移完成'
  ]
};
```

### 2. 零停机迁移
```sql
-- 零停机迁移示例
-- 1. 创建新表（不影响现有表）
CREATE TABLE certificates_new (
  -- 新结构
);

-- 2. 复制数据
INSERT INTO certificates_new 
SELECT * FROM certificates;

-- 3. 验证数据完整性
SELECT COUNT(*) FROM certificates;
SELECT COUNT(*) FROM certificates_new;

-- 4. 原子切换
BEGIN;
  ALTER TABLE certificates RENAME TO certificates_old;
  ALTER TABLE certificates_new RENAME TO certificates;
COMMIT;

-- 5. 清理旧表（可选）
DROP TABLE certificates_old;
```

### 3. 迁移监控
```typescript
// 迁移监控
const monitorMigration = async () => {
  const metrics = {
    startTime: new Date(),
    tablesAffected: 0,
    recordsMigrated: 0,
    errors: []
  };
  
  try {
    // 执行迁移
    await runMigration();
    
    // 更新指标
    metrics.tablesAffected = await countAffectedTables();
    metrics.recordsMigrated = await countMigratedRecords();
    
    console.log('迁移完成:', metrics);
  } catch (error) {
    metrics.errors.push(error);
    console.error('迁移失败:', metrics);
    throw error;
  }
};
```

## 故障排除

### 1. 常见问题

#### 迁移冲突
```sql
-- 解决迁移冲突
-- 检查是否有未完成的迁移
SELECT * FROM schema_migrations 
WHERE applied_at > NOW() - INTERVAL '1 hour'
ORDER BY applied_at DESC;

-- 清理失败的迁移
DELETE FROM schema_migrations 
WHERE version = 'failed_migration_version';
```

#### 数据不一致
```sql
-- 检查数据一致性
-- 比较表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'certificates'
ORDER BY ordinal_position;

-- 检查数据完整性
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN template_id IS NULL THEN 1 END) as null_template_id,
  COUNT(CASE WHEN publisher_id IS NULL THEN 1 END) as null_publisher_id
FROM certificates;
```

### 2. 恢复策略
```sql
-- 从备份恢复
-- 1. 停止应用
-- 2. 恢复数据库
pg_restore -d database_name backup_file.sql

-- 3. 重新应用迁移
-- 4. 启动应用
```

## 相关文档

- [数据库初始化](./02-DATABASE-SETUP.md)
- [项目设置指南](./01-SETUP.md)
- [调试指南](./13-DEBUG.md) 