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

function App() {
  const [drinkIndex, setDrinkIndex] = useState(0)
  const [intakeTime, setIntakeTime] = useState(nowAsHHMM())
  const [result, setResult] = useState(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!result) return
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [result])

  const drink = DRINKS[drinkIndex]

  const handleCalculate = () => {
    setNow(new Date())
    setResult({ drinkIndex, intakeTime, dose: drink.mg })
  }

  const computed = useMemo(() => {
    if (!result) return null

    const [h, m] = result.intakeTime.split(':').map(Number)
    const intakeDate = new Date(now)
    intakeDate.setHours(h, m, 0, 0)
    if (intakeDate > now) {
      intakeDate.setDate(intakeDate.getDate() - 1)
    }

    const elapsedHours = (now - intakeDate) / (1000 * 60 * 60)
    const remaining = result.dose * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS)
    const remainingClamped = Math.max(0, remaining)
    const percent = Math.round((remainingClamped / result.dose) * 100)

    const halfLivesToZero = Math.log2(result.dose / ZERO_THRESHOLD_MG)
    const zeroDate = new Date(intakeDate.getTime() + halfLivesToZero * HALF_LIFE_HOURS * 60 * 60 * 1000)

    const sleepRef = new Date(intakeDate)
    sleepRef.setHours(SLEEP_HOUR, 0, 0, 0)
    if (sleepRef < intakeDate) sleepRef.setDate(sleepRef.getDate() + 1)
    const hoursToSleep = (sleepRef - intakeDate) / (1000 * 60 * 60)
    const remainingAtSleep = result.dose * Math.pow(0.5, hoursToSleep / HALF_LIFE_HOURS)
    const showSleepWarning = remainingAtSleep > SLEEP_WARNING_THRESHOLD_MG

    return {
      remaining: Math.round(remainingClamped),
      percent: Math.max(0, Math.min(100, percent)),
      zeroDate,
      showSleepWarning,
    }
  }, [result, now])

  return (
    <div className="page">
      <AdBanner position="top" />

      <div className="card">
        <h1>☕ 카페인 계산기</h1>
        <p className="subtitle">지금 내 몸 안에 카페인이 얼마나 남아있을까?</p>

        <label className="field">
          <span>음료 선택</span>
          <select value={drinkIndex} onChange={(e) => setDrinkIndex(Number(e.target.value))}>
            {DRINKS.map((d, i) => (
              <option key={d.name} value={i}>
                {d.emoji} {d.name} ({d.mg}mg)
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>섭취 시간</span>
          <input
            type="time"
            value={intakeTime}
            onChange={(e) => setIntakeTime(e.target.value)}
          />
        </label>

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
