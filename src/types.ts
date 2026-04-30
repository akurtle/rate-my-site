export const CATEGORIES = [
  'All',
  'Portfolio',
  'SaaS',
  'E-commerce',
  'Agency',
  'Landing Page',
  'Blog',
  'Dashboard',
] as const

export const TIME_FILTERS = ['Today', 'This Week', 'All Time'] as const
export const SORT_OPTIONS = ['Top Rated', 'Most Voted', 'Newest'] as const
export const ACCENT_OPTIONS = ['lime', 'cyan', 'amber', 'pink'] as const
export const CARD_SIZE_OPTIONS = ['compact', 'medium', 'large'] as const

export type Category = (typeof CATEGORIES)[number]
export type TimeFilter = (typeof TIME_FILTERS)[number]
export type SortOption = (typeof SORT_OPTIONS)[number]
export type AccentOption = (typeof ACCENT_OPTIONS)[number]
export type CardSizeOption = (typeof CARD_SIZE_OPTIONS)[number]

export type DisplayOptions = {
  accentColor: AccentOption
  cardSize: CardSizeOption
  showScores: boolean
  roundedCards: boolean
}

export type Site = {
  id: string
  name: string
  url: string
  description: string
  tags: string[]
  category: Category
  rating: number
  reviews: number
  votes: number
  trend: string
  featured: boolean
  author: string
  createdAt?: string | null
  screenshotUrl?: string | null
  screenshotStatus?: string | null
  screenshots?: string[]
}

export type SiteRow = {
  id: string
  name: string
  url: string
  description: string
  tags: string[] | null
  avg_rating: number | string | null
  rating_count: number | null
  created_at: string | null
  owner_id: string | null
  screenshot_url?: string | null
  screenshot_status?: string | null
  site_screenshots?: { url: string }[] | null
}
