import type { Category, Site, SiteRow, SortOption } from '../types'
import { categoryAliases } from './constants'

export function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

export function getSiteCategory(tags: string[]): Category {
  for (const tag of tags) {
    const alias = categoryAliases[normalizeKey(tag)]
    if (alias && alias !== 'All') return alias
  }
  return 'Portfolio'
}

export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function categorySlug(category: Category) {
  return normalizeKey(category)
}

export function getTrendLabel(createdAt: string | null, reviews: number) {
  if (!createdAt) return 'New'
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return 'New'
  const days = Math.floor((Date.now() - createdTime) / 86400000)
  if (days <= 1) return 'New today'
  if (days <= 7) return 'New this week'
  if (reviews > 100) return 'Top rated'
  return 'Steady'
}

export function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(5, score))
}

export function mapSiteRow(row: SiteRow): Site {
  const tags = row.tags?.filter(Boolean) ?? []
  const category = getSiteCategory(tags)
  const rating = clampScore(Number(row.avg_rating ?? 0))
  const reviews = row.rating_count ?? 0

  return {
    id: row.id,
    name: row.name,
    url: displayUrl(row.url),
    description: row.description,
    tags: tags.length ? tags : [category],
    category,
    rating,
    reviews,
    votes: reviews,
    trend: getTrendLabel(row.created_at, reviews),
    featured: rating >= 4.5 || reviews >= 25,
    author: row.owner_id ? `@${row.owner_id.slice(0, 6)}` : 'Community',
    createdAt: row.created_at,
    screenshotUrl: row.screenshot_url ?? null,
    screenshotStatus: row.screenshot_status ?? null,
    screenshots: row.site_screenshots?.map((shot) => shot.url) ?? [],
  }
}

export function deriveNameFromUrl(url: string) {
  const withProtocol = url.startsWith('http') ? url : `https://${url}`
  try {
    const host = new URL(withProtocol).hostname.replace(/^www\./, '')
    const label = host.split('.')[0] || host
    return label
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  } catch {
    return url.trim()
  }
}

export function sortSites(sites: Site[], sortOption: SortOption) {
  return [...sites].sort((a, b) => {
    if (sortOption === 'Top Rated') {
      return b.rating - a.rating || b.votes - a.votes
    }
    if (sortOption === 'Most Voted') {
      return b.votes - a.votes || b.rating - a.rating
    }
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime || b.id.localeCompare(a.id)
  })
}
