import type { Category, DisplayOptions } from '../types'

export const initialDisplayOptions: DisplayOptions = {
  accentColor: 'lime',
  cardSize: 'medium',
  showScores: true,
  roundedCards: true,
}

export const categoryAliases: Record<string, Category> = {
  all: 'All',
  portfolio: 'Portfolio',
  saas: 'SaaS',
  'e-commerce': 'E-commerce',
  ecommerce: 'E-commerce',
  agency: 'Agency',
  'landing-page': 'Landing Page',
  landingpage: 'Landing Page',
  landing: 'Landing Page',
  blog: 'Blog',
  dashboard: 'Dashboard',
  tools: 'Dashboard',
}
