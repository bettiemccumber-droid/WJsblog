import { useEffect, useState } from 'react'
import { getCachedMergedPosts, loadPublishedPosts } from '../content/published'
import type { Post } from '../content/types'

export function useMergedPosts() {
  const [posts, setPosts] = useState<Post[]>(() => getCachedMergedPosts())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadPublishedPosts().then((merged) => {
      if (cancelled) return
      setPosts(merged)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { posts, loading }
}

export function usePostBySlug(slug: string | undefined) {
  const { posts, loading } = useMergedPosts()
  const post = slug ? (posts.find((p) => p.slug === slug) ?? null) : null
  return { post, posts, loading }
}
