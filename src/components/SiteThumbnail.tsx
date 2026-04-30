import type { CSSProperties } from 'react'
import type { Site } from '../types'

type SiteThumbnailProps = {
  site: Pick<Site, 'id' | 'name' | 'url' | 'screenshotUrl' | 'screenshots'>
  variant?: 'card' | 'detail'
}

const palettes = [
  ['#263a5f', '#8efb6a'],
  ['#3f2b55', '#f5d060'],
  ['#153f45', '#74e6f2'],
  ['#502236', '#ff8fbd'],
  ['#2b354f', '#d0d7ff'],
  ['#3d3928', '#f0d47d'],
]

function SiteThumbnail({ site, variant = 'card' }: SiteThumbnailProps) {
  const image = site.screenshotUrl || site.screenshots?.[0]
  const palette = palettes[hashId(site.id) % palettes.length]
  const initial = site.name.trim().charAt(0).toUpperCase() || 'R'
  const style = {
    '--thumb-bg': palette[0],
    '--thumb-accent': palette[1],
  } as CSSProperties

  return (
    <div className={`site-thumbnail ${variant === 'detail' ? 'detail-thumbnail' : ''}`} style={style}>
      {image ? (
        <img src={image} alt={`${site.name} preview`} />
      ) : (
        <div className="thumbnail-pattern" aria-hidden="true">
          <span className="thumbnail-initial">{initial}</span>
          <span className="thumbnail-url">{site.url}</span>
        </div>
      )}
    </div>
  )
}

function hashId(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export default SiteThumbnail
