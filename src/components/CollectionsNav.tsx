import { CATEGORIES } from '../types'
import type { Category } from '../types'
import { categorySlug } from '../lib/siteUtils'

type CollectionsNavProps = {
  onCategorySelect: (category: Category) => void
}

function CollectionsNav({ onCategorySelect }: CollectionsNavProps) {
  return (
    <section
      className="internal-links-section"
      id="collections"
      aria-labelledby="collections-title"
    >
      <div>
        <p className="section-kicker">* EXPLORE</p>
        <h2 id="collections-title">Website design rating categories</h2>
      </div>
      <nav className="internal-link-grid" aria-label="Website rating categories">
        {CATEGORIES.map((category) => (
          <a
            key={category}
            href={`/?category=${categorySlug(category)}#gallery`}
            onClick={(event) => {
              event.preventDefault()
              onCategorySelect(category)
            }}
          >
            {category === 'All' ? 'All Website Reviews' : `${category} Website Reviews`}
          </a>
        ))}
      </nav>
    </section>
  )
}

export default CollectionsNav
