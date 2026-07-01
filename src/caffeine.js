// mg values are per-serving reference points gathered from brand nutrition
// disclosures (see references footer in the UI). Actual content varies by
// extraction, batch, and cup size, so a "직접 입력" option is always offered.
export const DRINK_GROUPS = [
  {
    label: '커피 (브랜드별 아메리카노)',
    items: [
      { name: '스타벅스 아메리카노 (Tall)', mg: 150, emoji: '☕' },
      { name: '이디야 아메리카노 (L)', mg: 232, emoji: '☕' },
      { name: '메가커피 아메리카노 (24oz)', mg: 193, emoji: '☕' },
      { name: '컴포즈커피 아메리카노', mg: 26, emoji: '☕' },
      { name: '커피 (홈브루/직접 내림)', mg: 95, emoji: '🍵' },
    ],
  },
  {
    label: '기타 음료',
    items: [
      { name: '라떼', mg: 50, emoji: '🥛' },
      { name: '콜라', mg: 34, emoji: '🥤' },
      { name: '초콜릿', mg: 12, emoji: '🍫' },
      { name: '에너지음료 (레드불)', mg: 80, emoji: '⚡' },
      { name: '차', mg: 25, emoji: '🍃' },
    ],
  },
]

export const DRINKS = DRINK_GROUPS.flatMap((g) => g.items)
export const CUSTOM_INDEX = DRINKS.length // sentinel: "직접 입력"

export const HALF_LIFE_HOURS = 5
const ZERO_THRESHOLD_MG = 1
const SLEEP_WARNING_THRESHOLD_MG = 20
const SLEEP_HOUR = 23 // 11 PM
export const FDA_DAILY_LIMIT_MG = 400 // FDA healthy-adult guidance

export function nowAsHHMM(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatAmPm(date) {
  let h = date.getHours()
  const m = date.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  h = h % 12 || 12
  return `${ampm} ${h}:${String(m).padStart(2, '0')}`
}

// HH:MM -> Date, choosing today or yesterday so the intake is always in the past
export function toIntakeDate(timeStr, reference) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(reference)
  d.setHours(h, m, 0, 0)
  if (d > reference) d.setDate(d.getDate() - 1)
  return d
}

export function doseOf(entry) {
  if (entry.drinkIndex === CUSTOM_INDEX) return Number(entry.customMg) || 0
  return DRINKS[entry.drinkIndex]?.mg ?? 0
}

function remainingAt(doseMg, intakeDate, t) {
  const elapsedHours = (t - intakeDate) / (1000 * 60 * 60)
  if (elapsedHours <= 0) return 0
  return doseMg * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS)
}

export function statusOf(percent) {
  if (percent >= 60) return { label: '카페인 최고조', color: '#fb8c00' }
  if (percent >= 25) return { label: '대사가 진행 중', color: '#ffb74d' }
  if (percent > 0) return { label: '거의 다 빠졌어요', color: '#66bb6a' }
  return { label: '카페인 없음', color: '#9e9e9e' }
}

// Caffeine decays independently per dose, so the total in the body at any
// moment is just the sum of each dose's own exponential decay curve.
export function calculateCaffeine(entries, now) {
  const doses = entries.map((e) => ({
    dose: doseOf(e),
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

  const sleepRef = new Date(latestIntake)
  sleepRef.setHours(SLEEP_HOUR, 0, 0, 0)
  if (sleepRef < latestIntake) sleepRef.setDate(sleepRef.getDate() + 1)
  const remainingAtSleep = totalRemainingAt(sleepRef)

  return {
    remaining: Math.round(Math.max(0, remainingNow)),
    percent: Math.max(0, Math.min(100, percent)),
    totalDose,
    zeroDate: new Date(hi),
    showSleepWarning: remainingAtSleep > SLEEP_WARNING_THRESHOLD_MG,
    breakdown: doses.map((d, i) => ({
      ...entries[i],
      dose: d.dose,
      remaining: Math.round(Math.max(0, remainingAt(d.dose, d.intakeDate, now))),
    })),
  }
}
