import { ACCENT_OPTIONS, CARD_SIZE_OPTIONS } from '../types'
import type { DisplayOptions } from '../types'

type TweaksPanelProps = {
  options: DisplayOptions
  onChange: (options: DisplayOptions) => void
}

function TweaksPanel({ options, onChange }: TweaksPanelProps) {
  return (
    <div className="tweaks-panel" aria-label="Display tweaks">
      <div className="swatch-row" aria-label="Accent color">
        {ACCENT_OPTIONS.map((accent) => (
          <button
            key={accent}
            className={`color-swatch color-${accent} ${options.accentColor === accent ? 'active' : ''}`}
            type="button"
            aria-label={`Use ${accent} accent`}
            onClick={() => onChange({ ...options, accentColor: accent })}
          />
        ))}
      </div>
      <div className="segmented-control" aria-label="Card size">
        {CARD_SIZE_OPTIONS.map((size) => (
          <button
            key={size}
            type="button"
            className={options.cardSize === size ? 'active' : ''}
            onClick={() => onChange({ ...options, cardSize: size })}
          >
            {size}
          </button>
        ))}
      </div>
      <label className="toggle-control">
        <input
          type="checkbox"
          checked={options.showScores}
          onChange={(event) => onChange({ ...options, showScores: event.target.checked })}
        />
        Scores
      </label>
      <label className="toggle-control">
        <input
          type="checkbox"
          checked={options.roundedCards}
          onChange={(event) => onChange({ ...options, roundedCards: event.target.checked })}
        />
        Rounded
      </label>
    </div>
  )
}

export default TweaksPanel
