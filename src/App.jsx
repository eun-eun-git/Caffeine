import React, { useEffect, useMemo, useState } from 'react'
import AdBanner from './AdBanner.jsx'
import './App.css'

const DRINKS = [
  { name: '아메리카노', mg: 75, emoji: '☕' },
  { name: '라떼', mg: 50, emoji: '🥛' },
  { name: '콜라', mg: 34, emoji: '🥤' },
  { name: '초콜릿', mg: 12, emoji: '🍫' },
  { name: '에너지음료 (레드불)', mg: 80, emoji: '⚡' },
  { name: '커피 (홈브루)', mg: 95, emoji: '🍵' },
  { name: '차', mg: 25, emoji: '🍃' },
]

const HALF_LIFE_HOURS = 5
const ZERO_THRESHOLD_MG = 1
const SLEEP_WARNING_THRESHOLD_MG = 20
const SLEEP_HOUR = 23 // 11 PM

let nextId = 1
function makeEntry() {
  return { id: nextId++, drinkIndex: 0, time: nowAsHHMM() }
}

function nowAsHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatAmPm(date) {
  let h = date.getHours()
  const m = date.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  h = h % 12
  if (h === 0) h = 12
  return `${ampm} ${h}:${String(m).padStart(2, '0')}`
}

// HH:MM -> Date, choosing today or yesterday so the intake is always in the past
function toIntakeDate(timeStr, reference) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(reference)
  d.setHours(h, m, 0, 0)
  if (d > reference) d.setDate(d.getDate() - 1)
  return d
}

function remainingAt(doseMg, intakeDate, t) {
  const elapsedHours = (t - intakeDate) / (1000 * 60 * 60)
  if (elapsedHours <= 0) return 0
  return doseMg * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS)
}

function App() {
  const [entries, setEntries] = useState([makeEntry()])
  const [snapshot, setSnapshot] = useState(null) // frozen entries at calc time
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!snapshot) return
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [snapshot])

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const addEntry = () => setEntries((prev) => [...prev, makeEntry()])
  const removeEntry = (id) => setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev))

  const handleCalculate = () => {
    setNow(new Date())
    setSnapshot(entries.map((e) => ({ ...e })))
  }

  const computed = useMemo(() => {
    if (!snapshot) return null

    const doses = snapshot.map((e) => ({
      dose: DRINKS[e.drinkIndex].mg,
      intakeDate: toIntakeDate(e.time, now),
    }))
    const totalDose = doses.reduce((sum, d) => sum + d.dose, 0)

    const totalRemainingAt = (t) => doses.reduce((sum, d) => sum + remainingAt(d.dose, d.intakeDate, t), 0)

    const remainingNow = totalRemainingAt(now)
    const percent = totalDose > 0 ? Math.round((remainingNow / totalDose) * 100) : 0

    // binary search for the moment total caffeine drops below the "gone" threshold
    const latestIntake = new Date(Math.max(...doses.map((d) => d.intakeDate.getTime())))
    let lo = latestIntake.getTime()
    let hi = latestIntake.getTime() + 200 * 60 * 60 * 1000
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2
      if (totalRemainingAt(new Date(mid)) > ZERO_THRESHOLD_MG) lo = mid
      else hi = mid
    }
    const zeroDate = new Date(hi)

    const sleepRef = new Date(latestIntake)
    sleepRef.setHours(SLEEP_HOUR, 0, 0, 0)
    if (sleepRef < latestIntake) sleepRef.setDate(sleepRef.getDate() + 1)
    const remainingAtSleep = totalRemainingAt(sleepRef)
    const showSleepWarning = remainingAtSleep > SLEEP_WARNING_THRESHOLD_MG

    return {
      remaining: Math.round(Math.max(0, remainingNow)),
      percent: Math.max(0, Math.min(100, percent)),
      zeroDate,
      showSleepWarning,
    }
  }, [snapshot, now])

  return (
    <div className="page">
      <AdBanner position="top" />

      <div className="card">
        <header className="hero">
          <div className="hero-emoji">☕</div>
          <h1>카페인 계산기</h1>
          <p className="subtitle">지금 내 몸 안에 카페인이 얼마나 남아있을까?</p>
        </header>

        <div className="entries">
          {entries.map((entry, idx) => (
            <div className="entry" key={entry.id}>
              <div className="entry-index">{idx + 1}</div>

              <div className="entry-fields">
                <select
                  value={entry.drinkIndex}
                  onChange={(e) => updateEntry(entry.id, { drinkIndex: Number(e.target.value) })}
                >
                  {DRINKS.map((d, i) => (
                    <option key={d.name} value={i}>
                      {d.emoji} {d.name} ({d.mg}mg)
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={entry.time}
                  onChange={(e) => updateEntry(entry.id, { time: e.target.value })}
                />
              </div>

              {entries.length > 1 && (
                <button className="remove-btn" onClick={() => removeEntry(entry.id)} aria-label="삭제">
                  ✕
                </button>
              )}
            </div>
          ))}

          <button className="add-btn" onClick={addEntry}>
            + 마신 음료 추가
          </button>
        </div>

        <button className="calc-btn" onClick={handleCalculate}>
          계산하기 🧮
        </button>

        {computed && (
          <div className="result">
            <p className="result-line">
              지금 체내 카페인: <strong>{computed.remaining}mg</strong> ({computed.percent}%)
            </p>
            <p className="result-line">
              완전히 없어지는 시간: <strong>{formatAmPm(computed.zeroDate)}</strong>
            </p>

            <div className="bar-wrap">
              <div
                className="bar-fill"
                style={{
                  width: `${computed.percent}%`,
                  background:
                    computed.percent > 60
                      ? '#ff9800'
                      : computed.percent > 25
                      ? '#ffb74d'
                      : '#66bb6a',
                }}
              />
              <span className="bar-label">{computed.percent}%</span>
            </div>

            {computed.showSleepWarning && (
              <div className="warning">
                ⚠️ 경고: 이 시간에 카페 마시면 밤 11시까지 깨어있을게요
              </div>
            )}
          </div>
        )}
      </div>

      <AdBanner position="bottom" />
    </div>
  )
}

export default App
