import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const holidayMap = {
  '01-01': 'New Year',
  '01-26': 'Republic Day',
  '03-04': 'Holi',
  '08-15': 'Independence Day',
  '10-02': 'Gandhi Jayanti',
  '11-08': 'Diwali',
  '12-25': 'Christmas',
  '2026-01-26': 'Republic Day',
  '2026-03-04': 'Holi',
  '2026-08-15': 'Independence Day',
  '2026-10-02': 'Gandhi Jayanti',
  '2026-11-08': 'Diwali',
  '2026-12-25': 'Christmas',
}

const tagMeta = {
  Work: { color: '#2563eb', label: 'Work' },
  Personal: { color: '#7c3aed', label: 'Personal' },
  Exam: { color: '#dc2626', label: 'Exam' },
  Travel: { color: '#0f766e', label: 'Travel' },
  Health: { color: '#16a34a', label: 'Health' },
}

const priorityMeta = {
  low: { label: 'Low' },
  medium: { label: 'Medium' },
  high: { label: 'High' },
}

const defaultThemePalette = {
  accent: [44, 149, 234],
  accent2: [77, 178, 255],
  accent3: [10, 132, 255],
}

const scenePalettes = {
  beach: {
    accent: [245, 158, 11],
    accent2: [56, 189, 248],
    accent3: [251, 191, 36],
  },
  corporate: {
    accent: [37, 99, 235],
    accent2: [51, 65, 85],
    accent3: [148, 163, 184],
  },
}

const mergeFestivalLabel = (existing, incoming) => {
  if (!existing) return incoming
  if (!incoming) return existing
  const existingParts = existing.split(' • ')
  if (existingParts.includes(incoming)) return existing
  return `${existing} • ${incoming}`
}

const toRgb = (value) => `rgb(${value[0]}, ${value[1]}, ${value[2]})`

const toRgba = (value, alpha) => `rgba(${value[0]}, ${value[1]}, ${value[2]}, ${alpha})`

const mixRgb = (a, b, amount) => [
  Math.round(a[0] + (b[0] - a[0]) * amount),
  Math.round(a[1] + (b[1] - a[1]) * amount),
  Math.round(a[2] + (b[2] - a[2]) * amount),
]

const rgbToHex = (value) => {
  if (!value) return '#000000'
  const arr = typeof value.rgb === 'function' ? value.rgb() : value
  if (!Array.isArray(arr)) return '#000000'
  return `#${arr.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

const buildThemeTokens = (mode, palette) => {
  const accent = palette?.accent || defaultThemePalette.accent
  const accent2 = palette?.accent2 || defaultThemePalette.accent2
  const accent3 = palette?.accent3 || defaultThemePalette.accent3
  const surface = mode === 'dark' ? 'rgba(2, 6, 23, 0.92)' : 'rgba(255, 255, 255, 0.96)'
  const panel = mode === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(248, 250, 252, 0.96)'
  const border = mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.28)'
  const text = mode === 'dark' ? '#e2e8f0' : '#0f172a'
  const muted = mode === 'dark' ? '#94a3b8' : '#64748b'
  return {
    accent,
    accent2,
    accent3,
    accentHex: rgbToHex(accent),
    accentSoft: toRgba(accent, mode === 'dark' ? 0.24 : 0.12),
      accentStrong: toRgb(mixRgb(accent, [255, 255, 255], mode === 'dark' ? 0.14 : 0.04)),
    surface,
    panel,
    border,
    text,
    muted,
    glow: mode === 'dark' ? toRgba(accent, 0.28) : toRgba(accent, 0.16),
    bg: mode === 'dark'
      ? `linear-gradient(135deg, rgba(10,20,45,1) 0%, rgba(15,23,42,0.95) 50%), radial-gradient(circle at 20% 30%, ${toRgba(accent3, 0.25)} 0%, transparent 50%)`
      : `linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.98) 50%), radial-gradient(circle at 20% 30%, ${toRgba(accent2, 0.2)} 0%, transparent 50%)`,
  }
}

const noteMatchesDate = (note, date) => {
  const target = toLocalDateId(date)
  if (note.scope === 'date') return note.date === target
  if (note.scope === 'range' && note.start && note.end) return target >= note.start && target <= note.end
  return false
}

const getDayClassTag = (date, notes) => {
  const matchingNote = notes.find((note) => noteMatchesDate(note, date))
  return matchingNote?.tag || undefined
}

const noteMatchesMonth = (note, monthDate) => {
  const month = monthKey(monthDate)
  if (note.scope === 'date') return note.date?.startsWith(month)
  if (note.scope === 'range') {
    const start = new Date(`${note.start}T00:00:00`)
    const end = new Date(`${note.end}T00:00:00`)
    return overlapDaysInMonth(start, end, monthDate) > 0
  }
  return false
}

const createEmptyDraft = (date) => ({
  scope: 'date',
  date: toLocalDateId(date),
  start: toLocalDateId(date),
  end: toLocalDateId(date),
  title: '',
  body: '',
  tag: 'Work',
  priority: 'medium',
})

const toLocalDateId = (date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const sameDate = (a, b) => {
  if (!a || !b) return false
  return toLocalDateId(a) === toLocalDateId(b)
}

const monthKey = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)

const toDayCode = (date) => `${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`

const resolveHoliday = (date, extraHolidayMap = {}) => {
  if (!date) return undefined
  const isoKey = toLocalDateId(date)
  const yearSpecific = `${date.getFullYear()}-${toDayCode(date)}`
  const recurring = toDayCode(date)
  return extraHolidayMap[isoKey] || holidayMap[yearSpecific] || holidayMap[recurring]
}

const getDayCount = (start, end) => {
  if (!start || !end) return 0
  return Math.floor((end - start) / 86400000) + 1
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const getRangeStats = (start, end) => {
  if (!start || !end || end < start) {
    return { days: 0, weekdays: 0, weekends: 0, weekendRatio: 0 }
  }

  let weekdays = 0
  let weekends = 0
  const days = getDayCount(start, end)
  const walker = new Date(start)

  for (let i = 0; i < days; i += 1) {
    const d = walker.getDay()
    if (d === 0 || d === 6) weekends += 1
    else weekdays += 1
    walker.setDate(walker.getDate() + 1)
  }

  return {
    days,
    weekdays,
    weekends,
    weekendRatio: days ? weekends / days : 0,
  }
}

const getIntentLabel = (start, end) => {
  const stats = getRangeStats(start, end)
  if (!stats.days) return 'Select a date range to unlock intent insights'
  if (stats.days >= 10 && stats.weekendRatio >= 0.28) return 'Intent Lens: Travel Block'
  if (stats.days >= 4 && stats.weekends === 0) return 'Intent Lens: Work Sprint'
  if (stats.days <= 2) return 'Intent Lens: Quick Task Window'
  if (stats.weekendRatio >= 0.55) return 'Intent Lens: Weekend Plan'
  return 'Intent Lens: Balanced Plan'
}

const getIntentChips = (start, end, keywordText) => {
  const stats = getRangeStats(start, end)
  if (!stats.days) return ['Select a range']

  const chips = []
  const lowerText = (keywordText || '').toLowerCase()

  if (stats.days >= 9 && stats.weekendRatio >= 0.3) chips.push('Travel Block')
  if (stats.days >= 4 && stats.weekends === 0) chips.push('Deep Work Sprint')
  if (stats.days >= 5 && stats.days <= 9) chips.push('Interview Prep')
  if (stats.days >= 6 && stats.weekendRatio < 0.25) chips.push('Exam Week')

  if (/interview|hr|resume|round/.test(lowerText)) chips.push('Interview Prep')
  if (/exam|revision|study|test/.test(lowerText)) chips.push('Exam Week')
  if (/trip|travel|flight|hotel/.test(lowerText)) chips.push('Travel Block')
  if (/focus|sprint|deadline|delivery/.test(lowerText)) chips.push('Deep Work Sprint')

  if (chips.length === 0) chips.push('Balanced Plan')
  return [...new Set(chips)].slice(0, 4)
}

const overlapDaysInMonth = (start, end, monthDate) => {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const overlapStart = start > monthStart ? start : monthStart
  const overlapEnd = end < monthEnd ? end : monthEnd
  if (overlapEnd < overlapStart) return 0
  return getDayCount(overlapStart, overlapEnd)
}

const generateMonthCells = (viewDate) => {
  const start = startOfMonth(viewDate)
  const end = endOfMonth(viewDate)
  const firstDay = (start.getDay() + 6) % 7
  const totalDays = end.getDate()
  const cells = []
  let tail = 1

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const date = new Date(start)
    date.setDate(start.getDate() - (i + 1))
    cells.push({ date, inCurrentMonth: false })
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ date: new Date(viewDate.getFullYear(), viewDate.getMonth(), day), inCurrentMonth: true })
  }

  while (cells.length % 7 !== 0) {
    const date = new Date(end)
    date.setDate(end.getDate() + tail)
    tail += 1
    cells.push({ date, inCurrentMonth: false })
  }

  return cells
}

function App() {
  const anchorDate = useMemo(() => new Date(), [])
  const [timelineOffset, setTimelineOffset] = useState(0)
  const [viewDate, setViewDate] = useState(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
  const [rangeStart, setRangeStart] = useState(null)
  const [rangeEnd, setRangeEnd] = useState(null)
  const [hoverDate, setHoverDate] = useState(null)
  const [monthlyNotes, setMonthlyNotes] = useState({})
  const [rangeNotes, setRangeNotes] = useState({})
  const [notes, setNotes] = useState([])
  const [noteDraft, setNoteDraft] = useState(createEmptyDraft(anchorDate))
  const [interactionHistory, setInteractionHistory] = useState([])
  const [noteEvents, setNoteEvents] = useState([])
  const [theme, setTheme] = useState('light')
  const [themePalette, setThemePalette] = useState(defaultThemePalette)
  const [navDirection, setNavDirection] = useState(1)
  const [dragState, setDragState] = useState({ active: false, anchor: null })
  const [dragPreview, setDragPreview] = useState(null)
  const [focusedDate, setFocusedDate] = useState(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1))
  const [scenePreset, setScenePreset] = useState('beach')
  const [flipAngle, setFlipAngle] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [scenePulse, setScenePulse] = useState(0)
  const [zoomDate, setZoomDate] = useState(null)
  const [hourPlans, setHourPlans] = useState({})
  const [zoomDetail, setZoomDetail] = useState({})
  const [modularDraft, setModularDraft] = useState({ title: '', body: '', tags: '', priority: 'medium', checklist: [] })
  const [checkItemInput, setCheckItemInput] = useState('')
  const [editorExpanded, setEditorExpanded] = useState(false)
  const cursorRingRef = useRef(null)
  const cursorDotRef = useRef(null)
  const cursorFrameRef = useRef(0)
  const cursorStateRef = useRef({ visible: false, active: false, x: 0, y: 0 })
  const lastSavedRangeRef = useRef('')
  const suppressClickRef = useRef(false)
  const flipPointerStartRef = useRef(null)
  const imageRef = useRef(null)
  const notesPanelRef = useRef(null)
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 })
  const longPressRef = useRef(null)

  const currentMonthKey = monthKey(viewDate)
  const cells = useMemo(() => generateMonthCells(viewDate), [viewDate])

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(viewDate),
    [viewDate],
  )

  const activeEnd = useMemo(() => {
    if (rangeEnd) return rangeEnd
    if (rangeStart && hoverDate && hoverDate >= rangeStart) return hoverDate
    return null
  }, [rangeEnd, rangeStart, hoverDate])

  const rangeLabel = useMemo(() => {
    if (!rangeStart) return 'No date range selected'
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!rangeEnd) return `Start: ${fmt.format(rangeStart)}`
    return `${fmt.format(rangeStart)} to ${fmt.format(rangeEnd)}`
  }, [rangeStart, rangeEnd])

  const rangeStorageKey = useMemo(() => {
    if (!rangeStart || !rangeEnd) return ''
    return `${toLocalDateId(rangeStart)}_${toLocalDateId(rangeEnd)}`
  }, [rangeStart, rangeEnd])

  const dragStartDate = dragPreview?.start || null
  const dragEndDate = dragPreview?.end || null
  const selectionStart = dragState.active ? dragStartDate || rangeStart : rangeStart
  const selectionEnd = dragState.active ? dragEndDate || rangeEnd : rangeEnd
  const activeSelectionEnd = selectionEnd || activeEnd
  const intentLabel = getIntentLabel(selectionStart, activeSelectionEnd)
  const activeRangeStats = getRangeStats(selectionStart, activeSelectionEnd)
  const scenePalette = useMemo(() => scenePalettes[scenePreset] || defaultThemePalette, [scenePreset])
  const themeTokens = useMemo(() => buildThemeTokens(theme, scenePalette), [theme, scenePalette])

  useEffect(() => {
    const savedMonthly = localStorage.getItem('wall_calendar_month_notes')
    const savedRange = localStorage.getItem('wall_calendar_range_notes')
    const savedHistory = localStorage.getItem('wall_calendar_interaction_history')
    const savedNoteEvents = localStorage.getItem('wall_calendar_note_events')
    const savedNotes = localStorage.getItem('wall_calendar_notes')
    const savedTheme = localStorage.getItem('wall_calendar_theme')
    if (savedMonthly) setMonthlyNotes(JSON.parse(savedMonthly))
    if (savedRange) setRangeNotes(JSON.parse(savedRange))
    if (savedHistory) setInteractionHistory(JSON.parse(savedHistory))
    if (savedNoteEvents) setNoteEvents(JSON.parse(savedNoteEvents))
    if (savedNotes) setNotes(JSON.parse(savedNotes))
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    } else {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(dark ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('wall_calendar_month_notes', JSON.stringify(monthlyNotes))
  }, [monthlyNotes])

  useEffect(() => {
    localStorage.setItem('wall_calendar_range_notes', JSON.stringify(rangeNotes))
  }, [rangeNotes])

  useEffect(() => {
    localStorage.setItem('wall_calendar_interaction_history', JSON.stringify(interactionHistory))
  }, [interactionHistory])

  useEffect(() => {
    localStorage.setItem('wall_calendar_note_events', JSON.stringify(noteEvents))
  }, [noteEvents])

  useEffect(() => {
    localStorage.setItem('wall_calendar_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('wall_calendar_notes', JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    const base = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + timelineOffset, 1)
    setViewDate(base)
  }, [timelineOffset, anchorDate])

  useEffect(() => {
    if (!focusedDate) return
    if (focusedDate.getFullYear() !== viewDate.getFullYear() || focusedDate.getMonth() !== viewDate.getMonth()) {
      const nextFocused = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
      setFocusedDate(nextFocused)
    }
  }, [viewDate, focusedDate])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) return

    const ring = cursorRingRef.current
    const dot = cursorDotRef.current
    if (!ring || !dot) return

    const renderCursor = () => {
      cursorFrameRef.current = 0
      const { visible, active, x, y } = cursorStateRef.current
      const ringOffset = active ? 22 : 16
      const dotOffset = active ? 4 : 3

      ring.style.transform = `translate3d(${x - ringOffset}px, ${y - ringOffset}px, 0) scale(${visible ? 1 : 0.6})`
      ring.style.opacity = visible ? '1' : '0'
      dot.style.transform = `translate3d(${x - dotOffset}px, ${y - dotOffset}px, 0) scale(${visible ? (active ? 1.35 : 1) : 0.4})`
      dot.style.opacity = visible ? '1' : '0'
    }

    const scheduleRender = () => {
      if (cursorFrameRef.current) return
      cursorFrameRef.current = window.requestAnimationFrame(renderCursor)
    }

    const onMove = (event) => {
      const target = event.target
      const isInteractive = target instanceof HTMLElement && Boolean(target.closest('button, a, input, textarea, select, [role="button"]'))

      cursorStateRef.current.visible = true
      cursorStateRef.current.active = isInteractive
      cursorStateRef.current.x = event.clientX
      cursorStateRef.current.y = event.clientY
      scheduleRender()
    }

    const onLeave = () => {
      cursorStateRef.current.visible = false
      cursorStateRef.current.active = false
      scheduleRender()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      if (cursorFrameRef.current) {
        window.cancelAnimationFrame(cursorFrameRef.current)
        cursorFrameRef.current = 0
      }
    }
  }, [])

  useEffect(() => {
    const onUp = () => {
      if (!dragState.active) return
      if (dragPreview?.start && dragPreview?.end && (!sameDate(dragPreview.start, dragState.anchor) || !sameDate(dragPreview.end, dragState.anchor))) {
        setRangeStart(dragPreview.start)
        setRangeEnd(dragPreview.end)
      }
      setDragState({ active: false, anchor: null })
      setDragPreview(null)
    }

    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragState.active, dragPreview])

  // Dynamic image color extraction intentionally disabled in the baseline version.

  useEffect(() => {
    if (!rangeStart || !rangeEnd) return
    const key = `${toLocalDateId(rangeStart)}_${toLocalDateId(rangeEnd)}`
    if (lastSavedRangeRef.current === key) return

    const stats = getRangeStats(rangeStart, rangeEnd)
    setInteractionHistory((prev) => [
      {
        start: toLocalDateId(rangeStart),
        end: toLocalDateId(rangeEnd),
        days: stats.days,
        weekdays: stats.weekdays,
        weekends: stats.weekends,
        weekendRatio: stats.weekendRatio,
        label: getIntentLabel(rangeStart, rangeEnd).replace('Intent Lens: ', ''),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 120))
    lastSavedRangeRef.current = key
  }, [rangeStart, rangeEnd])

  const onSelectDate = (date) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    if (rangeStart && rangeEnd && sameDate(rangeStart, date) && sameDate(rangeEnd, date)) {
      openZoomForDate(date)
      return
    }

    if (!rangeStart) {
      setRangeStart(date)
      setRangeEnd(date)
      return
    }

    if (rangeStart && rangeEnd && sameDate(rangeStart, rangeEnd) && !sameDate(rangeStart, date)) {
      if (date < rangeStart) {
        setRangeStart(date)
        setRangeEnd(rangeEnd)
      } else {
        setRangeEnd(date)
      }
      return
    }

    if (rangeStart && rangeEnd) {
      setRangeStart(date)
      setRangeEnd(date)
      return
    }

    if (date < rangeStart) {
      setRangeEnd(rangeStart)
      setRangeStart(date)
      return
    }

    setRangeEnd(date)
  }

  const commitSelection = (start, end) => {
    const orderedStart = start <= end ? start : end
    const orderedEnd = start <= end ? end : start
    setRangeStart(orderedStart)
    setRangeEnd(orderedEnd)
    setFocusedDate(orderedEnd)
  }

  const moveFocus = (days) => {
    const next = new Date(focusedDate || viewDate)
    next.setDate(next.getDate() + days)
    setFocusedDate(next)
    if (next.getFullYear() !== viewDate.getFullYear() || next.getMonth() !== viewDate.getMonth()) {
      const monthDiff = (next.getFullYear() - anchorDate.getFullYear()) * 12 + (next.getMonth() - anchorDate.getMonth())
      setNavDirection(days > 0 ? 1 : -1)
      setTimelineOffset(clamp(monthDiff, -18, 18))
    }
  }

  const handleGridKeyDown = (event) => {
    if (!focusedDate) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus(-1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(7)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(-7)
    } else if (event.key === 'Home') {
      event.preventDefault()
      const next = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1)
      setFocusedDate(next)
    } else if (event.key === 'End') {
      event.preventDefault()
      const next = endOfMonth(focusedDate)
      setFocusedDate(next)
    } else if (event.key === 'PageUp') {
      event.preventDefault()
      setNavDirection(-1)
      setTimelineOffset((prev) => clamp(prev - 1, -18, 18))
    } else if (event.key === 'PageDown') {
      event.preventDefault()
      setNavDirection(1)
      setTimelineOffset((prev) => clamp(prev + 1, -18, 18))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectDate(focusedDate)
    }
  }

  const prevMonth = () => {
    setNavDirection(-1)
    setTimelineOffset((prev) => clamp(prev - 1, -18, 18))
  }

  const nextMonth = () => {
    setNavDirection(1)
    setTimelineOffset((prev) => clamp(prev + 1, -18, 18))
  }

  const clearSelection = () => {
    setRangeStart(null)
    setRangeEnd(null)
    setHoverDate(null)
    setDragPreview(null)
    setDragState({ active: false, anchor: null })
  }

  // Dynamic image color extraction intentionally disabled in this version.
  const monthNoteValue = monthlyNotes[currentMonthKey] || ''
  const rangeNoteValue = rangeStorageKey ? rangeNotes[rangeStorageKey] || '' : ''
  const monthlyNotesLines = Array.from({ length: 6 }, (_, i) => i)
  const isDark = theme === 'dark'

  const intentChips = useMemo(() => {
    const keywordText = `${monthNoteValue} ${rangeNoteValue} ${Object.values(rangeNotes).slice(0, 6).join(' ')}`
    return getIntentChips(selectionStart, activeSelectionEnd, keywordText)
  }, [selectionStart, activeSelectionEnd, monthNoteValue, rangeNoteValue, rangeNotes])

  const todayHoliday = useMemo(() => resolveHoliday(new Date(), {}), [])

  const sceneStyles = useMemo(() => {
    if (scenePreset === 'corporate') {
      return {
        heroGradient: isDark
          ? 'linear-gradient(120deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.95) 45%, rgba(51,65,85,0.9) 100%)'
          : 'linear-gradient(120deg, #dbeafe 0%, #f8fafc 45%, #e2e8f0 100%)',
        headingClass: 'font-sans tracking-[0.18em] uppercase',
        cardShadow: isDark ? '0 28px 60px rgba(2,6,23,0.45)' : '0 24px 52px rgba(15,23,42,0.2)',
      }
    }

    return {
      heroGradient: isDark
        ? 'linear-gradient(120deg, rgba(15,23,42,0.95) 0%, rgba(14,116,144,0.5) 45%, rgba(217,119,6,0.35) 100%)'
        : 'linear-gradient(120deg, #fde68a 0%, #fef3c7 38%, #bfdbfe 100%)',
      headingClass: 'font-title tracking-[0.1em] uppercase',
      cardShadow: isDark ? '0 30px 64px rgba(8,47,73,0.45)' : '0 26px 54px rgba(14,116,144,0.2)',
    }
  }, [scenePreset, isDark])

  const behaviorSummary = useMemo(() => {
    const short = interactionHistory.filter((r) => r.days <= 3).length
    const long = interactionHistory.filter((r) => r.days >= 7).length
    const weekendHeavy = interactionHistory.filter((r) => r.weekendRatio >= 0.45).length
    const personality = long > short + 2 ? 'spacious' : short > long + 2 ? 'compact' : 'balanced'
    return {
      short,
      long,
      weekendHeavy,
      personality,
      prefersWeekends: interactionHistory.length > 0 ? weekendHeavy / interactionHistory.length >= 0.45 : false,
    }
  }, [interactionHistory])

  const rhythmInsight = useMemo(() => {
    if (!noteEvents.length) return 'Pattern Detector: Start writing notes to unlock planning rhythm suggestions.'
    const freq = Array(7).fill(0)
    noteEvents.forEach((d) => {
      if (Number.isInteger(d) && d >= 0 && d <= 6) freq[d] += 1
    })
    const topDay = freq.indexOf(Math.max(...freq))
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][topDay]
    if (topDay === 1) return 'Pattern Detector: Weekly planning rhythm detected, Monday focus is dominant.'
    return `Pattern Detector: Your strongest note rhythm is ${dayName}.`
  }, [noteEvents])

  const personalityMotion = behaviorSummary.personality === 'compact' ? 0.18 : behaviorSummary.personality === 'spacious' ? 0.34 : 0.26
  const personalityDensityClass = behaviorSummary.personality === 'compact'
    ? 'gap-4'
    : behaviorSummary.personality === 'spacious'
      ? 'gap-6'
      : 'gap-5'

  const ghostDateMap = useMemo(() => {
    const map = {}
    interactionHistory.slice(0, 30).forEach((entry) => {
      const start = new Date(`${entry.start}T00:00:00`)
      const end = new Date(`${entry.end}T00:00:00`)
      const safeEnd = end > start ? end : start
      const days = Math.min(getDayCount(start, safeEnd), 45)
      const walker = new Date(start)
      for (let i = 0; i < days; i += 1) {
        const id = toLocalDateId(walker)
        map[id] = (map[id] || 0) + 1
        walker.setDate(walker.getDate() + 1)
      }
    })
    return map
  }, [interactionHistory])

  const monthStory = useMemo(() => {
    const stories = interactionHistory
      .map((entry) => {
        const start = new Date(`${entry.start}T00:00:00`)
        const end = new Date(`${entry.end}T00:00:00`)
        return {
          ...entry,
          overlap: overlapDaysInMonth(start, end, viewDate),
        }
      })
      .filter((entry) => entry.overlap > 0)

    const selectedDaysFromHistory = stories.reduce((sum, entry) => sum + entry.overlap, 0)
    const selectedRangeOverlap =
      selectionStart && activeSelectionEnd
        ? overlapDaysInMonth(selectionStart, activeSelectionEnd, viewDate)
        : 0
    const selectedDays = selectedDaysFromHistory + selectedRangeOverlap
    const trips = stories.filter((entry) => entry.days >= 7).length
    const focusFromHistory = stories.reduce((sum, entry) => sum + Math.max(0, Math.round(entry.overlap * (1 - entry.weekendRatio))), 0)
    const focus = focusFromHistory + Math.max(0, Math.round(selectedRangeOverlap * (1 - activeRangeStats.weekendRatio)))
    const notesCount = notes.filter((note) => noteMatchesMonth(note, viewDate)).length + (monthNoteValue.trim() ? 1 : 0)
    const upcomingEvents = [
      ...Object.entries(holidayMap)
        .filter(([key]) => key.length === 10 && key.startsWith(`${viewDate.getFullYear()}`))
        .map(([key, label]) => ({ date: new Date(`${key}T00:00:00`), label, type: 'holiday' })),
      ...notes
        .filter((note) => noteMatchesMonth(note, viewDate))
        .slice(0, 3)
        .map((note) => ({
          date: new Date(`${note.scope === 'range' ? note.start : note.date}T00:00:00`),
          label: note.title,
          type: 'note',
        })),
    ]
      .sort((a, b) => a.date - b.date)
      .slice(0, 3)

    return {
      selectedDays,
      trips,
      focus,
      notesCount,
      upcomingEvents,
      headline:
        selectedDays === 0
          ? 'No selections logged for this month yet.'
          : selectedDays > 18
            ? 'High-activity month with dense planning.'
            : selectedDays > 8
              ? 'Balanced planning month with clear structure.'
              : 'Light planning month with focused highlights.',
    }
  }, [interactionHistory, notes, viewDate, monthNoteValue, selectionStart, activeSelectionEnd, activeRangeStats.weekendRatio])

  const exportMonthStory = () => {
    const text = [
      `${monthLabel} Story`,
      `Selected days: ${monthStory.selectedDays}`,
      `Focus days estimate: ${monthStory.focus}`,
      `Trip windows: ${monthStory.trips}`,
      `Notes linked: ${monthStory.notesCount}`,
      `Summary: ${monthStory.headline}`,
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `month-story-${toLocalDateId(viewDate)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const loadDemoData = () => {
    const now = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const mk = (mOffset, sDay, eDay, label) => {
      const s = new Date(now.getFullYear(), now.getMonth() + mOffset, sDay)
      const e = new Date(now.getFullYear(), now.getMonth() + mOffset, eDay)
      const stats = getRangeStats(s, e)
      return {
        start: toLocalDateId(s),
        end: toLocalDateId(e),
        days: stats.days,
        weekdays: stats.weekdays,
        weekends: stats.weekends,
        weekendRatio: stats.weekendRatio,
        label,
        createdAt: new Date().toISOString(),
      }
    }

    const demoHistory = [
      mk(0, 3, 9, 'Work Sprint'),
      mk(0, 12, 18, 'Travel Block'),
      mk(0, 22, 23, 'Quick Task Window'),
      mk(-1, 7, 13, 'Balanced Plan'),
      mk(1, 4, 6, 'Weekend Plan'),
      mk(1, 11, 17, 'Work Sprint'),
    ]

    const demoMonthNotes = {
      [monthKey(now)]: 'Demo month loaded: review planning windows and story export.',
      [monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1))]: 'Product launch schedule and review loop.',
    }

    const demoRangeNotes = {
      [`${demoHistory[0].start}_${demoHistory[0].end}`]: 'Delivery sprint with QA checkpoints.',
      [`${demoHistory[1].start}_${demoHistory[1].end}`]: 'Family travel plan and booking confirmation.',
      [`${demoHistory[3].start}_${demoHistory[3].end}`]: 'Monthly planning and hiring interviews.',
    }

    const demoNoteEvents = [1, 1, 1, 3, 1, 5, 1, 2, 1, 1]

    setInteractionHistory(demoHistory)
    setMonthlyNotes(demoMonthNotes)
    setRangeNotes(demoRangeNotes)
    setNoteEvents(demoNoteEvents)
    setRangeStart(new Date(`${demoHistory[0].start}T00:00:00`))
    setRangeEnd(new Date(`${demoHistory[0].end}T00:00:00`))
    setTimelineOffset(0)
    setNoteDraft(createEmptyDraft(now))
    setFocusedDate(new Date(`${demoHistory[1].start}T00:00:00`))
    setDragPreview(null)
    setDragState({ active: false, anchor: null })
    setNotes([
      {
        id: 'demo-1',
        scope: 'range',
        date: demoHistory[0].start,
        start: demoHistory[0].start,
        end: demoHistory[0].end,
        title: 'Sprint Delivery',
        body: 'QA checkpoints and stakeholder review.',
        tag: 'Work',
        priority: 'high',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-2',
        scope: 'date',
        date: demoHistory[1].start,
        start: demoHistory[1].start,
        end: demoHistory[1].start,
        title: 'Trip prep',
        body: 'Tickets, bags, and hotel confirmation.',
        tag: 'Travel',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const addNote = () => {
    const title = noteDraft.title.trim()
    const body = noteDraft.body.trim()
    if (!title && !body) return

    const entry = {
      id: crypto.randomUUID(),
      scope: noteDraft.scope,
      date: noteDraft.date,
      start: noteDraft.scope === 'range' ? noteDraft.start : noteDraft.date,
      end: noteDraft.scope === 'range' ? noteDraft.end : noteDraft.date,
      title: title || 'Untitled note',
      body,
      tag: noteDraft.tag,
      priority: noteDraft.priority,
      createdAt: new Date().toISOString(),
    }

    setNotes((prev) => [entry, ...prev])
    const refDate = new Date(`${entry.scope === 'range' ? entry.start : entry.date}T00:00:00`)
    setNoteEvents((prev) => [refDate.getDay(), ...prev].slice(0, 120))
    setNoteDraft((prev) => ({
      ...createEmptyDraft(new Date(`${entry.scope === 'range' ? entry.end : entry.date}T00:00:00`)),
      scope: prev.scope,
      tag: prev.tag,
      priority: prev.priority,
    }))
  }

  const visibleNotes = notes.filter((note) => noteMatchesMonth(note, viewDate))

  const startDragSelection = (date) => {
    setDragState({ active: true, anchor: date })
    setDragPreview({ start: date, end: date })
    setFocusedDate(date)
  }

  const updateDragSelection = (date) => {
    if (!dragState.active || !dragState.anchor) return
    const start = date < dragState.anchor ? date : dragState.anchor
    const end = date < dragState.anchor ? dragState.anchor : date
    setDragPreview({ start, end })
    if (!sameDate(date, dragState.anchor)) {
      suppressClickRef.current = true
    }
  }

  const openNoteComposerForDate = (date) => {
    setNoteDraft((prev) => ({
      ...prev,
      scope: 'date',
      date: toLocalDateId(date),
      start: toLocalDateId(date),
      end: toLocalDateId(date),
    }))
    notesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const touchStartNote = (date, event) => {
    if (event.pointerType !== 'touch') return
    clearTimeout(longPressRef.current)
    longPressRef.current = window.setTimeout(() => {
      openNoteComposerForDate(date)
    }, 450)
  }

  const touchEndNote = () => {
    clearTimeout(longPressRef.current)
  }

  const handleTouchDrag = (event) => {
    if (event.pointerType !== 'touch') return
    touchRef.current = { startX: event.clientX, startY: event.clientY, startTime: Date.now() }
  }

  const handleTouchEnd = (event) => {
    if (event.pointerType !== 'touch') return
    const dx = event.clientX - touchRef.current.startX
    const dy = event.clientY - touchRef.current.startY
    const dt = Date.now() - touchRef.current.startTime
    if (dt < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      setNavDirection(dx > 0 ? -1 : 1)
      setTimelineOffset((prev) => clamp(prev + (dx > 0 ? -1 : 1), -18, 18))
    }
  }

  const startFlip = (event) => {
    flipPointerStartRef.current = event.clientX
    setIsFlipping(true)
  }

  const cycleScene = () => {
    setScenePreset((prev) => (prev === 'beach' ? 'corporate' : 'beach'))
    setScenePulse((prev) => prev + 1)
  }

  useEffect(() => {
    if (!isFlipping) return undefined

    const onMove = (event) => {
      const startX = flipPointerStartRef.current
      if (typeof startX !== 'number') return
      const dragDelta = Math.max(0, startX - event.clientX)
      setFlipAngle(clamp(Math.round(dragDelta * 0.75), 0, 180))
    }

    const onEnd = () => {
      setIsFlipping(false)
      const shouldFlip = flipAngle > 70
      if (shouldFlip) {
        setFlipAngle(180)
        window.setTimeout(() => {
          cycleScene()
          setFlipAngle(0)
        }, 240)
      } else {
        setFlipAngle(0)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [isFlipping, flipAngle])

  const addChecklistItem = () => {
    const value = checkItemInput.trim()
    if (!value) return
    setModularDraft((prev) => ({
      ...prev,
      checklist: [...prev.checklist, { id: crypto.randomUUID(), text: value, done: false }],
    }))
    setCheckItemInput('')
  }

  const toggleDraftCheck = (id) => {
    setModularDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    }))
  }

  const saveModularNote = () => {
    const title = modularDraft.title.trim()
    const body = modularDraft.body.trim()
    if (!title && !body && modularDraft.checklist.length === 0) return

    const targetDate = toLocalDateId(zoomDate || focusedDate || viewDate)
    const hasRange = Boolean(rangeStart && rangeEnd)
    const rangeStartId = hasRange ? toLocalDateId(rangeStart) : targetDate
    const rangeEndId = hasRange ? toLocalDateId(rangeEnd) : targetDate
    const firstTag = modularDraft.tags.split(',')[0]?.trim()
    const normalizedTag = firstTag && tagMeta[firstTag] ? firstTag : 'Work'

    const note = {
      id: crypto.randomUUID(),
      scope: hasRange ? 'range' : 'date',
      date: targetDate,
      start: rangeStartId,
      end: rangeEndId,
      title: title || 'Untitled note',
      body,
      tag: normalizedTag,
      tags: modularDraft.tags,
      priority: modularDraft.priority,
      checklist: modularDraft.checklist,
      createdAt: new Date().toISOString(),
    }

    setNotes((prev) => [note, ...prev])
    if (hasRange) {
      const key = `${rangeStartId}_${rangeEndId}`
      const checklistDone = modularDraft.checklist.filter((item) => item.done).length
      const checklistTotal = modularDraft.checklist.length
      const line = `${title || 'Range note'} [${modularDraft.priority}] ${modularDraft.tags ? `#${modularDraft.tags}` : ''} ${checklistTotal ? `(${checklistDone}/${checklistTotal} checklist)` : ''}`.trim()
      setRangeNotes((prev) => ({
        ...prev,
        [key]: prev[key] ? `${prev[key]}\n${line}` : line,
      }))
    }
    setModularDraft({ title: '', body: '', tags: '', priority: 'medium', checklist: [] })
    setCheckItemInput('')
  }

  const openZoomForDate = (date) => {
    setZoomDate(date)
    const key = toLocalDateId(date)
    setZoomDetail((prev) => ({ ...prev, [key]: prev[key] || '' }))
    setHourPlans((prev) => ({
      ...prev,
      [key]: prev[key] || {
        '08:00': '',
        '10:00': '',
        '12:00': '',
        '14:00': '',
        '16:00': '',
        '18:00': '',
      },
    }))
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <>
      <div 
        className="fixed inset-0 transition-all duration-300 -z-50"
        style={{ background: themeTokens.bg }}
      />
      <main
        className="relative z-10 w-full min-h-dvh px-2 py-4 transition-all duration-300 sm:px-4 sm:py-8 lg:py-12"
        style={{ color: themeTokens.text, fontFamily: scenePreset === 'corporate' ? 'Manrope, sans-serif' : 'Playfair Display, serif' }}
      >
      <AnimatePresence mode="wait">
        <motion.div
          key={scenePulse}
          initial={{ opacity: 0.35, scale: 0.92 }}
          animate={{ opacity: 0, scale: 1.1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background: scenePreset === 'beach'
              ? 'radial-gradient(circle at 20% 20%, rgba(251,191,36,0.2), transparent 55%)'
              : 'radial-gradient(circle at 70% 20%, rgba(59,130,246,0.2), transparent 55%)',
          }}
        />
      </AnimatePresence>

      <div
        ref={cursorRingRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[70] hidden h-8 w-8 rounded-full border md:block"
        style={{
          borderColor: isDark ? 'rgba(125, 211, 252, 0.72)' : toRgba(themeTokens.accent, 0.76),
          backgroundColor: isDark ? toRgba(themeTokens.accent2, 0.22) : toRgba(themeTokens.accent, 0.14),
          boxShadow: `0 0 0 4px ${toRgba(themeTokens.accent, isDark ? 0.08 : 0.06)}, 0 0 14px ${themeTokens.glow}`,
          backdropFilter: 'blur(2px)',
          opacity: 0,
          transform: 'translate3d(0, 0, 0) scale(0.6)',
          willChange: 'transform, opacity',
        }}
      />
      <div
        ref={cursorDotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[71] hidden h-2 w-2 rounded-full md:block"
        style={{
          backgroundColor: themeTokens.accentStrong,
          boxShadow: `0 0 10px ${themeTokens.glow}`,
          opacity: 0,
          transform: 'translate3d(0, 0, 0) scale(0.4)',
          willChange: 'transform, opacity',
        }}
      />

      <div className="mb-4 flex w-full flex-col gap-3 px-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex items-center gap-3 self-start rounded-2xl border px-4 py-3 shadow-sm backdrop-blur"
          style={{ borderColor: themeTokens.border, background: themeTokens.surface }}
        >
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: themeTokens.accentSoft, color: themeTokens.accentHex }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path
                fill="currentColor"
                d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v12A2.5 2.5 0 0 1 19.5 21h-15A2.5 2.5 0 0 1 2 18.5v-12A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12 8H5v8.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V10Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight sm:text-xl lg:text-2xl" style={{ color: themeTokens.text }}>
              Wall Calendar UI
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.28em] sm:text-sm" style={{ color: themeTokens.muted }}>
              Plan days, ranges, and notes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 lg:self-start">
          <button
            onClick={loadDemoData}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? 'border-cyan-700 bg-cyan-900/40 text-cyan-100 hover:bg-cyan-900/60'
                : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
            }`}
          >
            Load Mock Demo Data
          </button>
          <button
            onClick={toggleTheme}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? 'border-slate-600 bg-slate-900/80 text-slate-100 hover:bg-slate-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path
                  fill="currentColor"
                  d="M21 12.8A9.2 9.2 0 0 1 11.2 3a8.7 8.7 0 1 0 9.8 9.8Z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                <path
                  fill="currentColor"
                  d="M12 5.5a.75.75 0 0 1 .75.75v1.1a.75.75 0 0 1-1.5 0v-1.1A.75.75 0 0 1 12 5.5Zm0 10.95a.75.75 0 0 1 .75.75v1.1a.75.75 0 0 1-1.5 0v-1.1a.75.75 0 0 1 .75-.75Zm6.45-5.2a.75.75 0 0 1 .75-.75h1.1a.75.75 0 0 1 0 1.5h-1.1a.75.75 0 0 1-.75-.75ZM3.7 11.25h1.1a.75.75 0 0 1 0 1.5H3.7a.75.75 0 0 1 0-1.5Zm12.76-4.8a.75.75 0 0 1 1.06 0l.78.78a.75.75 0 1 1-1.06 1.06l-.78-.78a.75.75 0 0 1 0-1.06ZM5.7 17.02a.75.75 0 0 1 1.06 0l.78.78a.75.75 0 1 1-1.06 1.06l-.78-.78a.75.75 0 0 1 0-1.06Zm11.74 0 .78-.78a.75.75 0 0 1 1.06 1.06l-.78.78a.75.75 0 0 1-1.06-1.06ZM5.7 6.45l.78-.78a.75.75 0 1 1 1.06 1.06l-.78.78a.75.75 0 0 1-1.06-1.06ZM12 8.1a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: scenePreset === 'corporate' ? 0.35 : 0.6, ease: 'easeOut' }}
        className="w-full overflow-hidden rounded-xl border transition-all duration-300 sm:rounded-2xl lg:rounded-[28px]"
        style={{ background: themeTokens.surface, borderColor: themeTokens.border, boxShadow: sceneStyles.cardShadow }}
      >
        <div className="relative h-7 transition-colors duration-300" style={{ background: themeTokens.panel }}>
          <div className="absolute left-1/2 top-0 h-11 w-28 -translate-x-1/2 rounded-b-3xl border-x border-b transition-colors duration-300" style={{ borderColor: themeTokens.border, background: themeTokens.surface }} />
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="transition-colors duration-300 relative" style={{ background: themeTokens.panel }}>
            <div className="relative h-[230px] overflow-hidden sm:h-[320px] lg:h-[500px]">
              <motion.div
                onClick={cycleScene}
                className="absolute inset-0"
                style={{
                  background: sceneStyles.heroGradient,
                  transformOrigin: 'top right',
                  boxShadow: sceneStyles.cardShadow,
                  cursor: 'pointer',
                }}
                animate={{ rotateY: flipAngle }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              >
                <motion.div
                  className="absolute left-6 top-8 h-20 w-20 rounded-full bg-white/30 blur-xl"
                  animate={scenePreset === 'beach' ? { x: [0, 26, 0], y: [0, -8, 0] } : { x: [0, 10, 0], y: [0, -2, 0] }}
                  transition={{ duration: scenePreset === 'beach' ? 6 : 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className={`absolute right-16 top-16 h-12 w-20 rounded-full ${scenePreset === 'beach' ? 'bg-white/40' : 'bg-slate-200/35'}`}
                  animate={{ y: [0, -6, 0], x: [0, 8, 0] }}
                  transition={{ duration: scenePreset === 'beach' ? 5 : 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className={`absolute left-20 bottom-20 h-14 w-14 rounded-[45%] ${scenePreset === 'beach' ? 'bg-emerald-300/60' : 'bg-cyan-300/45'}`}
                  animate={{ rotate: [0, 10, -8, 0], y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className={`absolute bottom-10 h-16 w-16 rounded-full ${scenePreset === 'beach' ? 'bg-amber-300/60' : 'bg-slate-300/60'}`}
                  animate={{ x: ['5%', '78%', '5%'] }}
                  transition={{ duration: scenePreset === 'beach' ? 8 : 4.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {scenePreset === 'corporate' ? (
                  <div className="absolute inset-x-6 bottom-0 flex items-end gap-2">
                    {[36, 52, 46, 62, 40].map((h, idx) => (
                      <motion.div
                        key={`tower-${h}`}
                        className="w-10 rounded-t-md bg-slate-800/55"
                        style={{ height: `${h}%` }}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ delay: idx * 0.2, duration: 2.2, repeat: Infinity }}
                      />
                    ))}
                    <motion.div
                      className="absolute -top-16 right-2 h-14 w-14 rounded-full border-4 border-white/40"
                      animate={{ y: [0, 10, 0], rotate: [0, 10, 0] }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="absolute -bottom-8 -left-4 h-24 w-[58%] rotate-[14deg] bg-[#2c95ea]" />
                    <div className="absolute -bottom-10 right-0 h-28 w-[58%] -rotate-[18deg] bg-[#4db2ff]" />
                    <motion.div
                      className="absolute left-[42%] top-[34%] h-10 w-10 rounded-full border-4 border-white/55"
                      animate={{ rotate: [0, 360], scale: [1, 1.08, 1] }}
                      transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                    />
                  </>
                )}
              </motion.div>

              <button
                onPointerDown={startFlip}
                className="absolute right-0 top-0 h-12 w-12 cursor-grab rounded-bl-xl border-l border-b bg-white/30 backdrop-blur active:cursor-grabbing sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                style={{ borderColor: themeTokens.border, touchAction: 'none' }}
                title="Drag corner to flip scene"
              >
                <span className="sr-only">Flip calendar page</span>
                <div className="mx-auto mt-1.5 h-4 w-4 rounded-sm border border-slate-500/40 sm:mt-2 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="absolute bottom-4 right-4 text-right text-white sm:bottom-6 sm:right-6 lg:bottom-7 lg:right-7"
              >
                <p className="text-xs font-medium tracking-[0.14em] sm:text-sm sm:tracking-[0.16em]">{viewDate.getFullYear()}</p>
                <h1 className={`${sceneStyles.headingClass} text-2xl font-semibold leading-none sm:text-3xl lg:text-4xl`}>
                  {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(viewDate)}
                </h1>
                <p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-white/85 sm:mt-2 sm:text-xs sm:tracking-[0.15em]">
                  {scenePreset === 'beach' ? 'Beach Planner Mood' : 'Office Focus Mood'}
                </p>
              </motion.div>
            </div>

            <div className="grid gap-6 px-5 pb-6 pt-5 sm:grid-cols-[1fr_1.15fr] sm:px-6 sm:pb-7">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Notes</p>
                <div className="mt-3 space-y-2">
                  {monthlyNotesLines.map((line) => (
                    <div key={line} className={`h-[1px] w-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  ))}
                </div>
                <textarea
                  id="month-notes"
                  value={monthNoteValue}
                  onChange={(e) => {
                    setNoteEvents((prev) => [1, ...prev].slice(0, 120))
                    setMonthlyNotes((prev) => ({
                      ...prev,
                      [currentMonthKey]: e.target.value,
                    }))
                  }}
                  placeholder="Monthly memo"
                  className={`mt-4 h-24 w-full resize-none border-0 border-b bg-transparent p-0 text-sm outline-none focus:border-sky-500 ${
                    isDark ? 'border-slate-600 text-slate-200 placeholder:text-slate-500' : 'border-slate-300 text-slate-700 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <div className="rounded-xl border p-3 transition-colors duration-300" style={{ borderColor: themeTokens.border, background: themeTokens.accentSoft }}>
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {weekdays.map((day) => (
                    <div key={`mini-${day}`} className={`text-center text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {cells.slice(0, 35).map(({ date, inCurrentMonth }) => {
                    const miniStart = sameDate(date, rangeStart)
                    const miniEnd = sameDate(date, rangeEnd)
                    const miniInRange =
                      rangeStart && activeEnd
                        ? date >= rangeStart && date <= activeEnd
                        : false

                    return (
                      <button
                        key={`mini-${toLocalDateId(date)}`}
                        onClick={() => onSelectDate(date)}
                        className={`h-7 rounded-md text-[11px] font-medium transition ${
                          inCurrentMonth
                            ? isDark
                              ? 'text-slate-200'
                              : 'text-slate-700'
                            : isDark
                              ? 'text-slate-600'
                              : 'text-slate-300'
                        } ${miniStart || miniEnd ? 'bg-sky-600 text-white' : ''} ${
                          miniInRange && !miniStart && !miniEnd ? 'bg-sky-100 text-sky-900' : ''
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:col-span-2">
                <div ref={notesPanelRef} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${isDark ? 'border-cyan-500/60' : 'border-sky-500/60'}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isDark ? 'bg-cyan-300' : 'bg-sky-600'}`} />
                    </motion.span>
                    <label htmlFor="range-notes" className={`font-title text-sm font-semibold uppercase tracking-[0.15em] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Range Notes
                    </label>
                  </div>
                  <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Select a complete date range to add notes
                    </p>
                    <button
                      onClick={() => setEditorExpanded((prev) => !prev)}
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${isDark ? 'border-slate-600 text-slate-100 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-white'}`}
                    >
                      {editorExpanded ? 'Compact' : 'Expand Editor'}
                    </button>
                  </div>

                  <div className={`mt-3 grid gap-2 ${editorExpanded ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
                    <input
                      value={modularDraft.title}
                      onChange={(e) => setModularDraft((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Title"
                      className={`rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-700'}`}
                    />
                    <select
                      value={modularDraft.priority}
                      onChange={(e) => setModularDraft((prev) => ({ ...prev, priority: e.target.value }))}
                      className={`rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-700'}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <input
                      value={modularDraft.tags}
                      onChange={(e) => setModularDraft((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="Tags (comma separated)"
                      className={`rounded-xl border px-3 py-2 text-sm outline-none sm:col-span-2 ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-700'}`}
                    />
                  </div>

                  <textarea
                    id="range-notes"
                    value={rangeNoteValue}
                    disabled={!rangeStorageKey}
                    onChange={(e) => {
                      if (!rangeStorageKey) return
                      if (rangeStart) {
                        setNoteEvents((prev) => [rangeStart.getDay(), ...prev].slice(0, 120))
                      }
                      setRangeNotes((prev) => ({
                        ...prev,
                        [rangeStorageKey]: e.target.value,
                      }))
                    }}
                    placeholder={rangeStorageKey ? 'Attach notes to this selected range' : 'Select a complete date range to add notes'}
                    className={`mt-3 h-28 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed ${
                      isDark
                        ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500 disabled:bg-slate-800'
                        : 'border-slate-300 bg-white text-slate-700 placeholder:text-slate-400 disabled:bg-slate-100'
                    }`}
                  />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={checkItemInput}
                      onChange={(e) => setCheckItemInput(e.target.value)}
                      placeholder="Checklist item"
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-700'}`}
                    />
                    <button
                      onClick={addChecklistItem}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold sm:w-auto ${isDark ? 'border-slate-600 text-slate-100 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-white'}`}
                    >
                      Add Item
                    </button>
                  </div>

                  <div className="mt-3 space-y-1">
                    {modularDraft.checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={item.done} onChange={() => toggleDraftCheck(item.id)} />
                        <span className={item.done ? 'line-through opacity-70' : ''}>{item.text}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={saveModularNote}
                    className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: themeTokens.accentHex }}
                  >
                    Save Range Modular Note
                  </button>
                </div>

              </div>
            </div>
          </div>

          <div className="flex flex-col border-t transition-colors duration-300 lg:border-l lg:border-t-0" style={{ borderColor: themeTokens.border, background: themeTokens.panel }} >
            <div className="flex items-center justify-between border-b px-4 py-4 transition-colors duration-300 sm:px-6" style={{ borderColor: themeTokens.border }}>
              <button
                onClick={prevMonth}
                className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition sm:rounded-xl sm:px-3 sm:text-sm ${
                  isDark
                    ? 'border-slate-600 text-slate-100 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Previous
              </button>
              <p className={`font-title text-center text-base font-semibold sm:text-xl ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{monthLabel}</p>
              <button
                onClick={nextMonth}
                className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition sm:rounded-xl sm:px-3 sm:text-sm ${
                  isDark
                    ? 'border-slate-600 text-slate-100 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Next
              </button>
            </div>

            <div className={`grid ${personalityDensityClass} p-4 sm:p-6 transition-colors duration-300`} style={{ background: themeTokens.panel }}>
              <div className="rounded-2xl border px-4 py-3 transition-colors duration-300" style={{ borderColor: themeTokens.border, background: themeTokens.accentSoft }}>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Time-Shift Simulation Rail</p>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    value={timelineOffset}
                    onChange={(e) => setTimelineOffset(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-300 accent-sky-600"
                  />
                  <button
                    onClick={() => setTimelineOffset(0)}
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold ${isDark ? 'border-slate-600 text-slate-100 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-white'}`}
                  >
                    Today
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weekdays.map((day) => (
                  <div key={day} className={`text-center text-[11px] font-semibold uppercase tracking-[0.11em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {day}
                  </div>
                ))}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMonthKey}
                    custom={navDirection}
                    variants={{
                      initial: (direction) => ({ opacity: 0, x: direction * 30, rotateY: direction * 10 }),
                      animate: { opacity: 1, x: 0, rotateY: 0 },
                      exit: (direction) => ({ opacity: 0, x: direction * -24, rotateY: direction * -10 }),
                    }}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: personalityMotion, ease: 'easeOut' }}
                    className="col-span-7 grid grid-cols-7 gap-1.5 sm:gap-2"
                    tabIndex={0}
                    onKeyDown={handleGridKeyDown}
                    onPointerDownCapture={handleTouchDrag}
                    onPointerUpCapture={handleTouchEnd}
                    onTouchEnd={touchEndNote}
                    style={{ touchAction: 'pan-y' }}
                  >
                    {cells.map(({ date, inCurrentMonth }) => {
                      const isToday = sameDate(date, new Date())
                      const isFocused = sameDate(date, focusedDate)
                      const isStart = sameDate(date, selectionStart)
                      const isEnd = sameDate(date, selectionEnd)
                      const inRange =
                        selectionStart && activeSelectionEnd
                          ? date >= selectionStart && date <= activeSelectionEnd
                          : false
                      const holidayName = resolveHoliday(date, liveHolidayMap)
                      const isWeekend = [0, 6].includes(date.getDay())

                      const base = 'min-h-[3.2rem] rounded-lg border px-1 py-1 text-sm font-medium transition-all duration-200 sm:rounded-xl focus:outline-none'
                      const outMonth = inCurrentMonth
                        ? isDark
                          ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        : isDark
                          ? 'border-slate-800 bg-slate-900/80 text-slate-500'
                          : 'border-slate-100 bg-slate-50 text-slate-400'
                      const weekend = isWeekend && inCurrentMonth
                        ? behaviorSummary.prefersWeekends
                          ? isDark
                            ? 'text-sky-200'
                            : 'text-sky-800'
                          : isDark
                            ? 'text-sky-300'
                            : 'text-sky-700'
                        : ''
                        const today = isToday ? (isDark ? 'ring-2 ring-slate-500 ring-offset-1 ring-offset-slate-900' : 'ring-2 ring-slate-400 ring-offset-1') : ''
                        const focused = isFocused ? `ring-2 ring-offset-1 ${isDark ? 'ring-cyan-300 ring-offset-slate-900' : 'ring-cyan-500 ring-offset-white'}` : ''
                        const selected = isStart || isEnd ? 'text-white shadow-md' : ''
                      const between = inRange && !isStart && !isEnd
                        ? isDark
                          ? 'border-sky-700 bg-sky-900/45 text-sky-100'
                          : 'border-sky-300 bg-sky-100 text-sky-900'
                        : ''
                      const ghostCount = ghostDateMap[toLocalDateId(date)] || 0
                      const ghost =
                        ghostCount > 0 && !isStart && !isEnd && !inRange
                          ? isDark
                            ? 'border-amber-800 bg-amber-950/25'
                            : 'border-amber-200 bg-amber-50'
                          : ''

                      const holidayShort = holidayName && holidayName.length > 12 ? `${holidayName.slice(0, 12)}...` : holidayName

                      return (
                        <button
                          key={toLocalDateId(date)}
                            onPointerDown={(event) => {
                              if (event.pointerType === 'touch') touchStartNote(date, event)
                              startDragSelection(date)
                            }}
                            onPointerEnter={() => updateDragSelection(date)}
                            onPointerUp={() => touchEndNote()}
                            onClick={() => onSelectDate(date)}
                            onMouseEnter={() => setHoverDate(date)}
                          onMouseLeave={() => setHoverDate(null)}
                            onFocus={() => setFocusedDate(date)}
                            tabIndex={isFocused ? 0 : -1}
                            className={`${base} ${outMonth} ${weekend} ${today} ${focused} ${selected} ${between} ${ghost}`}
                            title={holidayName ? `${holidayName} - ${toLocalDateId(date)}` : toLocalDateId(date)}
                            style={
                              isStart || isEnd
                                ? { 
                                    backgroundColor: themeTokens.accentHex,
                                    borderColor: themeTokens.accentHex,
                                    color: 'white',
                                    boxShadow: `0 12px 24px ${themeTokens.glow}`,
                                    transition: 'all 0.2s ease'
                                  }
                                : inRange && !isStart && !isEnd
                                  ? { 
                                      borderColor: themeTokens.accentHex,
                                      borderWidth: '2px',
                                      backgroundColor: themeTokens.accentSoft,
                                      transition: 'all 0.2s ease'
                                    }
                                  : undefined
                            }
                        >
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center justify-center gap-1">
                                <span>{date.getDate()}</span>
                              </div>
                              {holidayShort && inCurrentMonth ? (
                                <span className={`max-w-full truncate text-[9px] leading-tight ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                                  {holidayShort}
                                </span>
                              ) : null}
                            </div>
                        </button>
                      )
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="rounded-2xl border p-4 transition-colors duration-300" style={{ borderColor: themeTokens.border, background: themeTokens.accentSoft }}>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>Selected Range</p>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{rangeLabel}</p>
                {todayHoliday ? (
                  <p className={`mt-1 text-xs font-medium ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                    Today festival: {todayHoliday}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {intentChips.map((chip) => (
                    <span
                      key={chip}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isDark ? 'border-cyan-700 bg-cyan-950/40 text-cyan-200' : 'border-cyan-300 bg-cyan-50 text-cyan-800'}`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                {activeRangeStats.days > 0 ? (
                  <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {activeRangeStats.days} days, {activeRangeStats.weekdays} weekdays, {activeRangeStats.weekends} weekend days
                  </p>
                ) : null}
                <button
                  onClick={clearSelection}
                  className={`mt-3 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    isDark
                      ? 'border-slate-600 text-slate-100 hover:bg-slate-700'
                      : 'border-slate-300 text-slate-700 hover:bg-white'
                  }`}
                >
                  Clear selection
                </button>
                {rangeStart && !rangeEnd ? (
                  <button
                    onClick={() => openZoomForDate(rangeStart)}
                    className={`mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition sm:ml-2 sm:mt-3 ${
                      isDark
                        ? 'border-cyan-700 text-cyan-200 hover:bg-cyan-900/30'
                        : 'border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                    }`}
                  >
                    Zoom Selected Date
                  </button>
                ) : null}
              </div>

              <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/55' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`font-title text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Mini Insights</p>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Quick view for your current month activity.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Selected days: {activeRangeStats.days}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Weekend days: {activeRangeStats.weekends}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Month note chars: {monthNoteValue.length}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Range note chars: {rangeNoteValue.length}
                  </div>
                </div>
                <div className="mt-3 rounded-lg border p-3" style={{ borderColor: themeTokens.border }}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Adaptive Calendar Personality</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Mode: {behaviorSummary.personality}. {behaviorSummary.personality === 'compact' ? 'Faster motion, tighter density.' : behaviorSummary.personality === 'spacious' ? 'Slower motion, more breathing room.' : 'Balanced density and pacing.'}
                  </p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{rhythmInsight}</p>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/55' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`font-title text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Month Narrative Generator</p>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{monthStory.headline}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Total focused days: {monthStory.focus}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Longest range: {Math.max(activeRangeStats.days, interactionHistory.length ? Math.max(...interactionHistory.map((e) => e.days)) : 0)}
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Weekend load: {Math.round(activeRangeStats.weekendRatio * 100)}%
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                    Note intensity: {monthNoteValue.length + rangeNoteValue.length}
                  </div>
                </div>
                <button
                  onClick={exportMonthStory}
                  className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    isDark ? 'border-cyan-700 text-cyan-200 hover:bg-cyan-900/30' : 'border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                  }`}
                >
                  Export Narrative Card
                </button>
              </div>


            </div>
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {zoomDate ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomDate(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(event) => event.stopPropagation()}
              className={`max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-title text-lg font-semibold">
                  Zoom into {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(zoomDate)}
                </p>
                <button
                  onClick={() => setZoomDate(null)}
                  className={`rounded-lg border px-2 py-1 text-xs ${isDark ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(hourPlans[toLocalDateId(zoomDate)] || {}).map(([hour, value]) => (
                  <label key={hour} className="grid gap-1 text-xs font-semibold uppercase tracking-[0.11em]">
                    {hour}
                    <input
                      value={value}
                      onChange={(e) => {
                        const key = toLocalDateId(zoomDate)
                        setHourPlans((prev) => ({
                          ...prev,
                          [key]: {
                            ...(prev[key] || {}),
                            [hour]: e.target.value,
                          },
                        }))
                      }}
                      placeholder="Hour-level plan"
                      className={`rounded-xl border px-3 py-2 text-sm normal-case outline-none ${isDark ? 'border-slate-600 bg-slate-950 text-slate-100' : 'border-slate-300 bg-slate-50 text-slate-700'}`}
                    />
                  </label>
                ))}
              </div>

              <textarea
                className={`mt-3 h-28 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? 'border-slate-600 bg-slate-950 text-slate-100' : 'border-slate-300 bg-slate-50 text-slate-700'}`}
                value={zoomDetail[toLocalDateId(zoomDate)] || ''}
                onChange={(e) => {
                  const key = toLocalDateId(zoomDate)
                  setZoomDetail((prev) => ({ ...prev, [key]: e.target.value }))
                }}
                placeholder="Detailed notes for this date"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </main>
    </>
  )
}

export default App
