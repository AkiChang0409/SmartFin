# SmartFin

[简体中文](./README.md) | [English](./README.en.md)

SmartFin 是一个面向新加坡中小企业的财务运营管理系统，覆盖 AR 文档处理、项目盈利分析、员工成本归集与税务汇总。

## 核心能力

- AR 文档上传与归档，支持单文件与 ZIP 批量处理
- OCR/LLM 文档识别与结构化提取（可接外部 provider）
- 客户发票生成器（草稿重编辑、A4 预览、文字型 PDF）
- 项目利润分析（收入、采购、人工、费用分层）
- 税务模块（GST 季度汇总、Corporate Tax、Individual Tax 估算）
- Dashboard 与报表导出能力

## 技术栈

- `SvelteKit`（全栈应用）
- `Cloudflare Workers`（运行时）
- `Cloudflare D1 + Drizzle ORM`（数据库）
- `Cloudflare R2`（文件存储）
- `Cloudflare KV`（配置存储）
- `Cloudflare Queues`（OCR 异步处理）

## 项目结构（核心目录）

```text
src/
  routes/
    (app)/                   # 业务页面（AR / Projects / Employees / Tax / Reports）
    api/                     # 后端 API（upload/ocr/invoices/projects/tax/dashboard）
  lib/
    server/                  # DB、R2、KV、OCR、税务等服务层
workers/
  ocr-consumer.ts            # OCR 队列消费者
drizzle/
  migrations/                # 数据库迁移
  seeds/                     # 本地 seed 数据
```

## 快速开始（本地）

```bash
npm install
npm run gen
npm run db:migrate:local
npm run db:seed:local
npm run dev:cf
```

打开本地地址后，建议从以下路径体验：

- `/dashboard`
- `/ar/customer-invoices`
- `/ar/customer-invoices/generate`
- `/ar/document-upload/project`
- `/projects`
- `/tax`

## 常用命令

```bash
# 开发与检查
npm run dev:cf
npm run check
npm run build

# 迁移与数据
npm run db:generate
npm run db:migrate:local
npm run db:migrate:remote
npm run db:seed:local
npm run db:seed:mock:local
npm run db:test:mock:local
```

## 部署

主应用（SvelteKit Worker）：

```bash
npm run build
wrangler deploy
```

OCR 消费者（独立 Worker）：

```bash
npm run deploy:ocr-consumer
```

## 环境变量

请在本地配置至少以下变量：

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`

可选（OCR / LLM）：

- `OCR_API_URL`
- `OCR_API_KEY`
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_PROVIDER`
- `OCR_PROVIDER`

## 当前边界

- `Generate & send` 已完成生成与入库存储流程，邮件发送链路待接入
- OCR/LLM 效果依赖外部 provider 质量与配额
- PDF 预览与最终渲染在极端内容下可能存在细微排版差异

## 路线图（简）

- [ ] 完成邮件发送闭环（模板、附件、状态回写）
- [ ] 发票模板配置化（多模板、多版本）
- [ ] OCR 队列可观测性与重试策略
- [ ] 补全 E2E 回归测试（上传、识别、生成、税务）
