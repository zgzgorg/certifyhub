# 系统管理员设置

## 概述

系统管理员是 CertifyHub 中的最高权限角色，拥有对整个系统的完全控制权。本文档详细介绍了系统管理员的设置、权限和功能。

## 系统管理员角色

### 1. 权限级别
```typescript
enum UserRole {
  ANONYMOUS = 'anonymous',    // 匿名用户
  USER = 'user',             // 普通用户
  ORGANIZATION = 'organization', // 组织用户
  ADMIN = 'admin',           // 管理员
  SYSTEM_ADMIN = 'system_admin' // 系统管理员
}
```

### 2. 系统管理员权限
- **用户管理**: 查看、编辑、删除所有用户
- **组织管理**: 批准、拒绝、管理所有组织
- **证书管理**: 查看、管理所有证书
- **模板管理**: 创建、编辑、删除所有模板
- **系统配置**: 修改系统设置和配置
- **数据管理**: 访问和导出所有数据
- **日志查看**: 查看系统日志和审计记录

## 数据库设置

### 1. 用户角色表
```sql
-- 创建用户角色枚举类型
CREATE TYPE user_role AS ENUM (
  'anonymous',
  'user', 
  'organization',
  'admin',
  'system_admin'
);

-- 添加角色字段到用户表
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 创建系统管理员函数
CREATE OR REPLACE FUNCTION create_system_admin(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET role = 'system_admin' 
  WHERE email = admin_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 2. 系统管理员策略
```sql
-- 系统管理员可以查看所有数据
CREATE POLICY "System admins can view all data" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'system_admin'
  )
);

CREATE POLICY "System admins can update all data" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'system_admin'
  )
);

-- 系统管理员可以管理所有组织
CREATE POLICY "System admins can manage all organizations" ON organizations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'system_admin'
  )
);

-- 系统管理员可以管理所有证书
CREATE POLICY "System admins can manage all certificates" ON certificates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'system_admin'
  )
);
```

## 系统管理员设置

### 1. 创建系统管理员
```sql
-- 方法1: 使用函数创建系统管理员
SELECT create_system_admin('admin@example.com');

-- 方法2: 直接更新用户角色
UPDATE users 
SET role = 'system_admin' 
WHERE email = 'admin@example.com';
```

### 2. 验证系统管理员
```sql
-- 检查系统管理员列表
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM users 
WHERE role = 'system_admin'
ORDER BY created_at DESC;
```

### 3. 系统管理员权限验证
```sql
-- 检查当前用户的角色
SELECT 
  auth.uid() as current_user_id,
  u.role as user_role
FROM users u
WHERE u.id = auth.uid();
```

## 系统管理员界面

### 1. 管理员仪表板
```typescript
// 系统管理员仪表板组件
const SystemAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    totalCertificates: 0,
    pendingApprovals: 0
  });
  
  useEffect(() => {
    fetchSystemStats();
  }, []);
  
  return (
    <div className="system-admin-dashboard">
      <h1>系统管理员仪表板</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>总用户数</h3>
          <p>{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>总组织数</h3>
          <p>{stats.totalOrganizations}</p>
        </div>
        <div className="stat-card">
          <h3>总证书数</h3>
          <p>{stats.totalCertificates}</p>
        </div>
        <div className="stat-card">
          <h3>待审批</h3>
          <p>{stats.pendingApprovals}</p>
        </div>
      </div>
      
      <div className="admin-actions">
        <Link href="/admin/users">用户管理</Link>
        <Link href="/admin/organizations">组织管理</Link>
        <Link href="/admin/certificates">证书管理</Link>
        <Link href="/admin/templates">模板管理</Link>
        <Link href="/admin/system">系统设置</Link>
      </div>
    </div>
  );
};
```

### 2. 用户管理界面
```typescript
// 用户管理组件
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('获取用户列表失败:', error);
      return;
    }
    
    setUsers(data);
    setLoading(false);
  };
  
  const updateUserRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId);
      
    if (error) {
      console.error('更新用户角色失败:', error);
      return;
    }
    
    fetchUsers();
  };
  
  return (
    <div className="user-management">
      <h2>用户管理</h2>
      
      {loading ? (
        <div>加载中...</div>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>姓名</th>
              <th>角色</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.full_name}</td>
                <td>
                  <select 
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                  >
                    <option value="user">用户</option>
                    <option value="organization">组织</option>
                    <option value="admin">管理员</option>
                    <option value="system_admin">系统管理员</option>
                  </select>
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <button onClick={() => deleteUser(user.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

### 3. 组织管理界面
```typescript
// 组织管理组件
const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([]);
  
  const approveOrganization = async (orgId: string) => {
    const { error } = await supabase
      .from('organizations')
      .update({ status: 'approved' })
      .eq('id', orgId);
      
    if (error) {
      console.error('批准组织失败:', error);
      return;
    }
    
    fetchOrganizations();
  };
  
  const rejectOrganization = async (orgId: string) => {
    const { error } = await supabase
      .from('organizations')
      .update({ status: 'rejected' })
      .eq('id', orgId);
      
    if (error) {
      console.error('拒绝组织失败:', error);
      return;
    }
    
    fetchOrganizations();
  };
  
  return (
    <div className="organization-management">
      <h2>组织管理</h2>
      
      <table className="organizations-table">
        <thead>
          <tr>
            <th>组织名称</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {organizations.map(org => (
            <tr key={org.id}>
              <td>{org.name}</td>
              <td>{org.email}</td>
              <td>
                <span className={`status ${org.status}`}>
                  {org.status}
                </span>
              </td>
              <td>{formatDate(org.created_at)}</td>
              <td>
                {org.status === 'pending' && (
                  <>
                    <button onClick={() => approveOrganization(org.id)}>
                      批准
                    </button>
                    <button onClick={() => rejectOrganization(org.id)}>
                      拒绝
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## 系统设置

### 1. 系统配置管理
```typescript
// 系统配置组件
const SystemSettings = () => {
  const [settings, setSettings] = useState({
    siteName: '',
    siteDescription: '',
    allowRegistration: true,
    requireEmailVerification: true,
    maxFileSize: 52428800,
    allowedFileTypes: ['pdf', 'png', 'jpg']
  });
  
  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value })
      .eq('key', key);
      
    if (error) {
      console.error('更新设置失败:', error);
      return;
    }
    
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <div className="system-settings">
      <h2>系统设置</h2>
      
      <div className="settings-form">
        <div className="setting-group">
          <label>网站名称</label>
          <input 
            type="text"
            value={settings.siteName}
            onChange={(e) => updateSetting('siteName', e.target.value)}
          />
        </div>
        
        <div className="setting-group">
          <label>网站描述</label>
          <textarea
            value={settings.siteDescription}
            onChange={(e) => updateSetting('siteDescription', e.target.value)}
          />
        </div>
        
        <div className="setting-group">
          <label>
            <input 
              type="checkbox"
              checked={settings.allowRegistration}
              onChange={(e) => updateSetting('allowRegistration', e.target.checked)}
            />
            允许用户注册
          </label>
        </div>
        
        <div className="setting-group">
          <label>
            <input 
              type="checkbox"
              checked={settings.requireEmailVerification}
              onChange={(e) => updateSetting('requireEmailVerification', e.target.checked)}
            />
            要求邮箱验证
          </label>
        </div>
      </div>
    </div>
  );
};
```

### 2. 系统监控
```typescript
// 系统监控组件
const SystemMonitoring = () => {
  const [metrics, setMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    activeUsers: 0,
    requestsPerMinute: 0
  });
  
  useEffect(() => {
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="system-monitoring">
      <h2>系统监控</h2>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>CPU使用率</h3>
          <p>{metrics.cpuUsage}%</p>
        </div>
        <div className="metric-card">
          <h3>内存使用率</h3>
          <p>{metrics.memoryUsage}%</p>
        </div>
        <div className="metric-card">
          <h3>磁盘使用率</h3>
          <p>{metrics.diskUsage}%</p>
        </div>
        <div className="metric-card">
          <h3>活跃用户</h3>
          <p>{metrics.activeUsers}</p>
        </div>
        <div className="metric-card">
          <h3>每分钟请求数</h3>
          <p>{metrics.requestsPerMinute}</p>
        </div>
      </div>
    </div>
  );
};
```

## 安全考虑

### 1. 访问控制
```typescript
// 系统管理员权限检查
const checkSystemAdminAccess = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
    
  return userData?.role === 'system_admin';
};

// 系统管理员路由保护
const SystemAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkSystemAdminAccess().then(access => {
      setHasAccess(access);
      setLoading(false);
    });
  }, []);
  
  if (loading) {
    return <div>检查权限中...</div>;
  }
  
  if (!hasAccess) {
    return <div>无权访问系统管理员功能</div>;
  }
  
  return <>{children}</>;
};
```

### 2. 审计日志
```typescript
// 系统管理员操作日志
const logSystemAdminAction = async (action: string, details: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const logEntry = {
    user_id: user?.id,
    action,
    details,
    timestamp: new Date().toISOString(),
    ip_address: '获取IP地址',
    user_agent: navigator.userAgent
  };
  
  const { error } = await supabase
    .from('admin_audit_logs')
    .insert([logEntry]);
    
  if (error) {
    console.error('记录审计日志失败:', error);
  }
};
```

## 故障排除

### 1. 常见问题

#### 系统管理员权限丢失
```sql
-- 检查用户角色
SELECT 
  id,
  email,
  role,
  created_at
FROM users 
WHERE email = 'admin@example.com';

-- 重新设置系统管理员
UPDATE users 
SET role = 'system_admin' 
WHERE email = 'admin@example.com';
```

#### 无法访问管理员功能
```typescript
// 检查权限配置
const debugAdminAccess = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('当前用户:', user);
  
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
      
    console.log('用户数据:', userData);
    console.log('用户角色:', userData?.role);
  }
};
```

### 2. 恢复系统管理员
```sql
-- 创建新的系统管理员
INSERT INTO users (id, email, full_name, role)
VALUES (
  gen_random_uuid(),
  'new-admin@example.com',
  'System Administrator',
  'system_admin'
);

-- 或者将现有用户提升为系统管理员
UPDATE users 
SET role = 'system_admin' 
WHERE email = 'existing-user@example.com';
```

## 相关文档

- [项目设置指南](./01-SETUP.md)
- [数据库初始化](./02-DATABASE-SETUP.md)
- [系统安全配置](./11-SECURITY.md) 