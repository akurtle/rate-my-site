import { useEffect, useState } from 'react'
import { fetchSites } from '../lib/api'
import { mapSiteRow } from '../lib/siteUtils'
import type { Site, SiteRow } from '../types'

export function useSites() {
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const loadSites = async () => {
      setIsLoading(true)
      setLoadError(null)
      const timeoutId = window.setTimeout(() => controller.abort(), 10000)
      try {
        const response = await fetchSites(undefined, undefined, { signal: controller.signal })
        if (!active) return
        const rows = (response.data ?? []) as SiteRow[]
        setSites(rows.map(mapSiteRow))
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === 'AbortError') {
          setLoadError('Loading sites timed out. Start the API or try again.')
        } else {
          setLoadError(error instanceof Error ? error.message : 'Failed to load sites.')
        }
        setSites([])
      } finally {
        window.clearTimeout(timeoutId)
        if (active) setIsLoading(false)
      }
    }

    loadSites()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return { sites, setSites, isLoading, loadError }
}
