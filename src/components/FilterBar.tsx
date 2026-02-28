type FilterBarProps = {
  filters: string[]
  activeFilter: string
  onChange: (filter: string) => void
}

function FilterBar({ filters, activeFilter, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div>
        <h2>Filter by category</h2>
        <p className="muted">Pick a focus or keep it wide open.</p>
      </div>
      <div className="filter-chips">
        {filters.map((filter) => {
          const isActive = filter === activeFilter
          return (
            <button
              key={filter}
              type="button"
              className={`chip ${isActive ? 'active' : ''}`}
              onClick={() => onChange(filter)}
            >
              {filter}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default FilterBar
