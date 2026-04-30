import type { Category, SortOption, TimeFilter } from '../App'

type FilterBarProps = {
  categories: readonly Category[]
  timeFilters: readonly TimeFilter[]
  sortOptions: readonly SortOption[]
  activeCategory: Category
  activeTime: TimeFilter
  sortOption: SortOption
  onCategoryChange: (category: Category) => void
  onTimeChange: (time: TimeFilter) => void
  onSortChange: (sort: SortOption) => void
}

function FilterBar({
  categories,
  timeFilters,
  sortOptions,
  activeCategory,
  activeTime,
  sortOption,
  onCategoryChange,
  onTimeChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="filter-bar" aria-label="Gallery filters">
      <div className="time-filter" aria-label="Time period">
        {timeFilters.map((time) => (
          <button
            key={time}
            type="button"
            className={time === activeTime ? 'active' : ''}
            onClick={() => onTimeChange(time)}
          >
            {time}
          </button>
        ))}
      </div>

      <span className="filter-divider" aria-hidden="true" />

      <div className="category-filter" aria-label="Category">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={category === activeCategory ? 'active' : ''}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="sort-filter" aria-label="Sort sites">
        <span>Sort:</span>
        {sortOptions.map((sort) => (
          <button
            key={sort}
            type="button"
            className={sort === sortOption ? 'active' : ''}
            onClick={() => onSortChange(sort)}
          >
            {sort}
          </button>
        ))}
      </div>
    </div>
  )
}

export default FilterBar
