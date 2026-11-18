# ChronoBlog (English Blog Site)

Modern, clean multi-category blog + product recommendations site.

## Features

- Landing page with hero background image
- Blog list: category filter, search, pagination, newest-first sorting
- Blog post detail pages with rich content blocks
- Products list + product detail pages with photos and descriptions
- About + Contact pages
- Social media widget with working links
- Smooth transitions, hover animations, back-to-top button
- Mobile responsive layout
- zjads publish API: new articles appear without redeploying static content

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## zjads / 数据采集平台发文

静态文章在 `src/content/posts.ts`。zjads 通过接口发文后，文章写入 Vercel Blob 的 `published-posts.json`，列表和详情立刻可读，不会改写 `posts.ts`，也不用为每一篇重新部署。

详情页地址是 `/blog/<slug>`。

### 环境变量（Vercel）

- `PUBLISH_TOKEN`：调用 `POST /api/posts` 时放在请求头 `Authorization: Bearer <PUBLISH_TOKEN>`。未配置或密钥不对时返回 401。
- 连接一个 **Private** Blob store 到本项目（会注入 `BLOB_READ_WRITE_TOKEN` 或 `BLOB_STORE_ID`）。必须用 Private：公开 store 覆盖同一 JSON 后，读取最多会滞后约一分钟。

站点域名：`https://synapsewave.store`

### 调用地址

```
POST https://synapsewave.store/api/posts
Content-Type: application/json
Authorization: Bearer <PUBLISH_TOKEN>
```

请求体字段：`title`、`excerpt`、`category`、`image`、`images`、`bodyHtml`、`merchantName`、`merchantUrl`、`mid`、`trackUrl`、`author`。`title` 和 `bodyHtml` 必填。

成功时返回 200：

```json
{
  "slug": "generated-english-kebab-slug",
  "url": "https://synapsewave.store/blog/generated-english-kebab-slug"
}
```

`url` 只会是 `https://synapsewave.store/blog/<slug>`。`merchantUrl` 只作记录。`bodyHtml` 里的购买和跟踪链接原样保存。

公开读取（不需要 token）：

- `GET https://synapsewave.store/api/posts`：接口发布的文章列表
- `GET https://synapsewave.store/api/posts/<slug>`：`{ "bodyHtml": "..." }`
- `DELETE https://synapsewave.store/api/posts/<slug>`：删除一篇接口文章（需要 token）

前端会把接口文章与静态 `posts.ts` 按 slug 合并；slug 相同优先用接口元数据，静态正文仍优先。
