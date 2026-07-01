import React, { useEffect, useMemo, useState } from 'react'
import AdBanner from './AdBanner.jsx'
import DrinkEntry from './DrinkEntry.jsx'
import { DRINKS, FDA_DAILY_LIMIT_MG, calculateCaffeine, doseOf, formatAmPm, nowAsHHMM, statusOf } from './caffeine.js'
import './App.css'

const STORAGE_KEY = 'caffeine-calc-entries'

let nextId = 1
function makeEntry() {
  return { id: nextId++, drinkIndex: 0, time: nowAsHHMM(), customMg: '' }
}

function loadSavedEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) : null
    if (!Array.isArray(saved) || saved.length === 0) return null
    return saved.map((e) => ({ ...e, id: nextId++ }))
  } catch {
    return null
  }
}

function App() {
  const [entries, setEntries] = useState(() => loadSavedEntries() ?? [makeEntry()])
  const [snapshot, setSnapshot] = useState(null) // frozen entries at calc time
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!snapshot) return
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [snapshot])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const totalDose = entries.reduce((sum, e) => sum + doseOf(e), 0)

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const addEntry = () => setEntries((prev) => [...prev, makeEntry()])
  const removeEntry = (id) => setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev))
  const resetEntries = () => {
    setEntries([makeEntry()])
    setSnapshot(null)
  }

  const handleCalculate = () => {
    setNow(new Date())
    setSnapshot(entries.map((e) => ({ ...e })))
  }

  const computed = useMemo(() => (snapshot ? calculateCaffeine(snapshot, now) : null), [snapshot, now])
  const status = computed ? statusOf(computed.percent) : null

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
          <div className="entries-head">
            <span className="entries-head-title">섭취 내역</span>
            <button className="reset-btn" onClick={resetEntries}>
              초기화
            </button>
          </div>

          {entries.map((entry, idx) => (
            <DrinkEntry
              key={entry.id}
              entry={entry}
              index={idx}
              canRemove={entries.length > 1}
              onChange={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}

          <button className="add-btn" onClick={addEntry}>
            + 마신 음료 추가
          </button>
        </div>

        <p className="disclaimer">
          ※ 브랜드/사이즈/추출 방식에 따라 카페인 함량은 크게 달라질 수 있어요. 정확한 값을 알고 있다면 "직접 입력"을 이용하세요.
        </p>

        <button className="calc-btn" onClick={handleCalculate} disabled={totalDose <= 0}>
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
              <div className="bar-fill" style={{ width: `${computed.percent}%`, background: status.color }} />
              <span className="bar-label">{computed.percent}%</span>
            </div>
            <p className="status-label" style={{ color: status.color }}>
              {status.label}
            </p>

            <div className="daily-limit">
              <div className="daily-limit-head">
                <span>오늘 총 섭취량</span>
                <span>
                  {computed.totalDose}mg / {FDA_DAILY_LIMIT_MG}mg
                </span>
              </div>
              <div className="daily-limit-bar">
                <div
                  className="daily-limit-fill"
                  style={{
                    width: `${Math.min(100, (computed.totalDose / FDA_DAILY_LIMIT_MG) * 100)}%`,
                    background: computed.totalDose > FDA_DAILY_LIMIT_MG ? '#e53935' : '#66bb6a',
                  }}
                />
              </div>
              {computed.totalDose > FDA_DAILY_LIMIT_MG && (
                <p className="daily-limit-warning">FDA 권장 1일 섭취 한도(400mg)를 초과했어요.</p>
              )}
            </div>

            {computed.breakdown.length > 1 && (
              <ul className="breakdown">
                {computed.breakdown.map((b) => (
                  <li key={b.id}>
                    {DRINKS[b.drinkIndex]?.emoji ?? '✏️'} {DRINKS[b.drinkIndex]?.name ?? '직접 입력'} · {b.time} →
                    현재 {b.remaining}mg
                  </li>
                ))}
              </ul>
            )}

            {computed.showSleepWarning && (
              <div className="warning">
                ⚠️ 경고: 이 시간에 카페 마시면 밤 11시까지 깨어있을게요
              </div>
            )}
          </div>
        )}

        <footer className="refs">
          <p>
            카페인 반감기는 평균 5~6시간이며 개인에 따라 1.5~9.5시간까지 차이가 날 수 있어요. FDA는 건강한 성인 기준
            1일 400mg 이하를, 식약처는 임산부 300mg 이하를 권고합니다. 취침 4시간 이내 100mg 이상 섭취는 수면에
            영향을 줄 수 있다는 연구도 있어요.
          </p>
          <p className="refs-links">
            출처:{' '}
            <a href="https://www.sleepfoundation.org/nutrition/how-long-does-it-take-caffeine-to-wear-off" target="_blank" rel="noreferrer">
              Sleep Foundation
            </a>
            ,{' '}
            <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11985402/" target="_blank" rel="noreferrer">
              NIH/PMC 임상연구
            </a>
            ,{' '}
            <a href="https://www.cdc.gov/niosh/work-hour-training-for-nurses/longhours/mod6/11.html" target="_blank" rel="noreferrer">
              CDC/NIOSH
            </a>
          </p>
        </footer>
      </div>

      <AdBanner position="bottom" />
    </div>
  )
}

export default App
