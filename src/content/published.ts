import { categories, posts as staticPosts } from './posts'
import type { Post, PostCategory } from './types'

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80'

export type PublicApiPost = {
  id?: number | string
  slug?: string
  title?: string
  category?: string
  date?: string
  readTime?: number
  author?: string
  image?: string
  excerpt?: string
  keywords?: string[]
}

let mergedPostsCache: Post[] | null = null
let loadPromise: Promise<Post[]> | null = null

function mapCategory(raw: string | undefined): PostCategory {
  const value = (raw || '').trim()
  if ((categories as string[]).includes(value)) return value as PostCategory
  const lower = value.toLowerCase()
  const hit = categories.find((c) => c.toLowerCase() === lower)
  if (hit) return hit
  if (/product|review/i.test(value)) return 'Product Reviews'
  if (/platform|pick/i.test(value)) return 'Platform Picks'
  if (/workflow/i.test(value)) return 'Workflows'
  if (/ai|tool/i.test(value)) return 'AI Tools'
  if (/how.?to|guide|tutorial/i.test(value)) return 'How-To'
  return 'Product Reviews'
}

function byDateDesc(a: Post, b: Post) {
  return b.dateISO.localeCompare(a.dateISO)
}

/**
 * Map a public API list item into the ChronoBlog Post shape.
 * Body HTML is loaded separately on the detail page.
 */
export function apiPostToPost(item: PublicApiPost): Post | null {
  const slug = typeof item.slug === 'string' ? item.slug.trim() : ''
  const title = typeof item.title === 'string' ? item.title.trim() : ''
  if (!slug || !title) return null

  const image =
    typeof item.image === 'string' && /^https?:\/\//i.test(item.image.trim())
      ? item.image.trim()
      : FALLBACK_COVER
  const keywords = Array.isArray(item.keywords)
    ? item.keywords.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
    : []
  const dateISO =
    typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date)
      ? item.date.slice(0, 10)
      : new Date().toISOString().slice(0, 10)

  return {
    id: `api-${item.id ?? slug}`,
    slug,
    title,
    excerpt: typeof item.excerpt === 'string' ? item.excerpt : '',
    dateISO,
    category: mapCategory(item.category),
    tags: keywords.slice(0, 6),
    coverImage: { src: image, alt: title },
    readingTimeMinutes:
      typeof item.readTime === 'number' && item.readTime > 0
        ? Math.round(item.readTime)
        : 5,
    blocks: [],
    source: 'api',
  }
}

export function mergePublishedPosts(apiItems: PublicApiPost[]): Post[] {
  const bySlug = new Map<string, Post>()
  for (const post of staticPosts) {
    bySlug.set(post.slug, { ...post, source: 'static' })
  }
  for (const item of apiItems) {
    const mapped = apiPostToPost(item)
    if (!mapped) continue
    const existing = bySlug.get(mapped.slug)
    if (existing?.source === 'static' && existing.blocks.length > 0) {
      // Keep static body; refresh list metadata from API when slug collides.
      bySlug.set(mapped.slug, {
        ...existing,
        title: mapped.title || existing.title,
        excerpt: mapped.excerpt || existing.excerpt,
        dateISO: mapped.dateISO || existing.dateISO,
        category: mapped.category || existing.category,
        coverImage: mapped.coverImage.src !== FALLBACK_COVER ? mapped.coverImage : existing.coverImage,
        readingTimeMinutes: mapped.readingTimeMinutes || existing.readingTimeMinutes,
        tags: mapped.tags.length ? mapped.tags : existing.tags,
      })
      continue
    }
    bySlug.set(mapped.slug, mapped)
  }
  return [...bySlug.values()].sort(byDateDesc)
}

async function fetchAndMergePublishedPosts(): Promise<Post[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch('/api/posts', {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return staticPosts.map((p) => ({ ...p, source: 'static' as const }))
    const data: unknown = await response.json()
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { posts?: unknown })?.posts)
        ? (data as { posts: PublicApiPost[] }).posts
        : []
    const merged = mergePublishedPosts(list as PublicApiPost[])
    mergedPostsCache = merged
    return merged
  } catch (error) {
    console.error('Published posts unavailable, showing static articles.', error)
    return staticPosts.map((p) => ({ ...p, source: 'static' as const }))
  } finally {
    clearTimeout(timer)
  }
}

/** Fetch GET /api/posts and merge with static posts. Failed request keeps static list. */
export function loadPublishedPosts(): Promise<Post[]> {
  if (mergedPostsCache) return Promise.resolve(mergedPostsCache)
  if (!loadPromise) loadPromise = fetchAndMergePublishedPosts()
  return loadPromise
}

/** Load body HTML for one API-published article. */
export async function loadPublishedBody(slug: string): Promise<string | null> {
  const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
  if (!response.ok) return null
  const data: unknown = await response.json()
  if (typeof data === 'string') return data
  const bodyHtml = (data as { bodyHtml?: unknown })?.bodyHtml
  return typeof bodyHtml === 'string' ? bodyHtml : null
}

export function getCachedMergedPosts(): Post[] {
  return mergedPostsCache ?? staticPosts.map((p) => ({ ...p, source: 'static' as const }))
}
