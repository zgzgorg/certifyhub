# GitHub Pages 部署指南

## 重要提醒

⚠️ **注意**：GitHub Pages 只支持静态网站，这意味着：
- 所有服务端功能将被禁用
- API 路由将无法工作
- 数据库连接可能受限
- 某些动态功能可能无法正常工作

## 部署步骤

### 1. 准备仓库

确保你的代码已经推送到 GitHub 仓库：

```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

### 2. 配置 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** 标签
3. 在左侧菜单中找到 **Pages**
4. 在 **Source** 部分选择 **GitHub Actions**
5. 保存设置

### 3. 配置环境变量（如果需要）

如果你的应用需要环境变量：

1. 在仓库的 **Settings** > **Secrets and variables** > **Actions**
2. 添加必要的环境变量（如 Supabase 配置）

### 4. 触发部署

推送代码到 `main` 分支将自动触发部署：

```bash
git push origin main
```

### 5. 查看部署状态

1. 进入仓库的 **Actions** 标签
2. 查看部署工作流的状态
3. 部署成功后，你的网站将在以下地址可用：
   `https://[你的用户名].github.io/[仓库名]`

## 本地测试

在部署前，你可以在本地测试构建：

```bash
# 安装依赖
npm install

# 构建静态文件
npm run build

# 查看构建输出
ls out/
```

## 故障排除

### 常见问题

1. **构建失败**
   - 检查 Node.js 版本兼容性
   - 确保所有依赖都已安装
   - 查看 Actions 日志获取详细错误信息

2. **页面显示 404**
   - 确保 `next.config.ts` 中启用了 `output: 'export'`
   - 检查 `trailingSlash: true` 设置
   - 验证 GitHub Pages 设置正确

3. **环境变量问题**
   - 确保在 GitHub Secrets 中正确设置了环境变量
   - 注意：GitHub Pages 不支持服务端环境变量

### 限制和注意事项

- **无服务端功能**：API 路由、服务端渲染等功能将无法工作
- **静态文件限制**：所有功能必须在前端实现
- **数据库连接**：可能需要调整数据库访问方式
- **认证功能**：可能需要重新设计认证流程

## 替代方案

如果 GitHub Pages 的限制影响你的应用功能，建议考虑：

1. **Vercel**：原生支持 Next.js，功能完整
2. **Netlify**：支持静态站点和服务器端功能
3. **Railway**：支持完整的 Node.js 应用

## 更多信息

- [Next.js 静态导出文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages 文档](https://pages.github.com/)
- [GitHub Actions 文档](https://docs.github.com/en/actions) 