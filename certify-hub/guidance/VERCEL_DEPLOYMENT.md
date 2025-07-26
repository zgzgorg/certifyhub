# Vercel 部署指南

## 为什么选择 Vercel？

- 🚀 **原生支持 Next.js**：由 Next.js 团队创建
- 💰 **免费计划慷慨**：无限项目，100GB带宽/月
- 🔄 **自动部署**：每次推送代码自动部署
- 🔒 **自动SSL**：HTTPS 证书自动配置
- 🌍 **全球CDN**：快速访问
- 📱 **移动端优化**：自动优化

## 部署步骤

### 方法1：通过 Vercel 网站（推荐）

#### 1. 准备代码
确保你的代码已推送到 GitHub：

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. 注册 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Sign Up"
3. 选择 "Continue with GitHub"（推荐）

#### 3. 导入项目
1. 登录后点击 "New Project"
2. 选择你的 GitHub 仓库
3. Vercel 会自动检测为 Next.js 项目
4. 点击 "Deploy"

#### 4. 配置环境变量
部署前需要配置 Supabase 环境变量：

1. 在部署页面找到 "Environment Variables" 部分
2. 添加以下变量：
   ```
   NEXT_PUBLIC_SUPABASE_URL=你的supabase项目URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的supabase匿名密钥
   ```
3. 点击 "Deploy"

### 方法2：通过 Vercel CLI

#### 1. 安装 Vercel CLI
```bash
npm i -g vercel
```

#### 2. 登录
```bash
vercel login
```

#### 3. 部署
```bash
# 在项目根目录运行
vercel

# 或直接部署到生产环境
vercel --prod
```

## 环境变量配置

### 必需的环境变量

在 Vercel 项目设置中添加：

1. 进入项目 Dashboard
2. 点击 "Settings" → "Environment Variables"
3. 添加以下变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 获取 Supabase 配置

1. 登录 [supabase.com](https://supabase.com)
2. 选择你的项目
3. 进入 "Settings" → "API"
4. 复制：
   - Project URL
   - anon/public key

## 自定义域名

### 添加自定义域名
1. 在 Vercel Dashboard 中进入项目
2. 点击 "Settings" → "Domains"
3. 添加你的域名
4. 按照提示配置 DNS 记录

### 免费域名
Vercel 提供免费的子域名：
- `your-project.vercel.app`
- `your-project-git-main-your-username.vercel.app`

## 自动部署配置

### GitHub 集成
1. 在 Vercel 中连接 GitHub 账户
2. 选择仓库
3. 每次推送到 `main` 分支自动部署

### 分支部署
- `main` 分支 → 生产环境
- 其他分支 → 预览环境

## 监控和分析

### 免费功能
- 📊 **实时分析**：访问量、性能
- 🚨 **错误监控**：自动错误检测
- ⚡ **性能监控**：页面加载速度
- 📱 **设备分析**：移动端/桌面端

## 常见问题

### Q: 部署失败怎么办？
A: 
1. 检查构建日志
2. 确认环境变量配置正确
3. 验证 Supabase 连接

### Q: 如何回滚到之前的版本？
A: 
1. 在 Vercel Dashboard 中
2. 进入 "Deployments"
3. 找到之前的版本
4. 点击 "Promote to Production"

### Q: 如何优化性能？
A: 
1. 启用图片优化
2. 使用 Next.js 缓存
3. 优化包大小

## 本地开发

### 安装 Vercel CLI
```bash
npm i -g vercel
```

### 本地运行
```bash
# 开发模式
npm run dev

# 生产模式测试
npm run build
npm start
```

### 本地环境变量
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 成本估算

### 免费计划使用情况
- **项目数量**：无限
- **带宽**：100GB/月（通常够用）
- **函数调用**：6000次/月
- **构建时间**：100分钟/月

### 典型使用场景
- 小型证书管理系统：✅ 免费计划足够
- 中等规模应用：✅ 免费计划足够
- 大型企业应用：可能需要 Pro 计划

## 下一步

1. **部署应用**：按照上述步骤部署
2. **配置域名**：添加自定义域名
3. **监控性能**：查看 Vercel Analytics
4. **优化应用**：根据分析结果优化

## 支持资源

- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Vercel 社区](https://github.com/vercel/vercel/discussions) 