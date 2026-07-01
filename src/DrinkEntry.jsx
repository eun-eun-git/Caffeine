import React from 'react'
import { DRINK_GROUPS, DRINKS, CUSTOM_INDEX, nowAsHHMM } from './caffeine.js'

function DrinkEntry({ entry, index, canRemove, onChange, onRemove }) {
  return (
    <div className="entry">
      <div className="entry-head">
        <span className="entry-index">{index + 1}</span>
        <span className="entry-title">마신 음료</span>
        {canRemove && (
          <button className="remove-btn" onClick={onRemove} aria-label="삭제">
            ✕
          </button>
        )}
      </div>

      <select
        className="entry-select"
        value={entry.drinkIndex}
        onChange={(e) => onChange({ drinkIndex: Number(e.target.value) })}
      >
        {DRINK_GROUPS.map((group) => (
          <optgroup label={group.label} key={group.label}>
            {group.items.map((d) => (
              <option key={d.name} value={DRINKS.indexOf(d)}>
                {d.emoji} {d.name} ({d.mg}mg)
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM_INDEX}>✏️ 직접 입력 (mg)</option>
      </select>

      <div className="entry-row2">
        {entry.drinkIndex === CUSTOM_INDEX && (
          <input
            className="entry-custom-mg"
            type="number"
            min="0"
            placeholder="mg 입력"
            value={entry.customMg}
            onChange={(e) => onChange({ customMg: e.target.value })}
          />
        )}
        <input
          className="entry-time"
          type="time"
          value={entry.time}
          onChange={(e) => onChange({ time: e.target.value })}
        />
        <button
          type="button"
          className="now-btn"
          onClick={() => onChange({ time: nowAsHHMM() })}
        >
          지금
        </button>
      </div>
    </div>
  )
}

export default DrinkEntry
