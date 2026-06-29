export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = startOfDay(now)
  const target = startOfDay(date)
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 1 && diffDays < 7) {
    return target.toLocaleDateString('en-US', { weekday: 'long' })
  }
  if (target.getFullYear() === now.getFullYear()) {
    return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }
  return target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

interface DaySeparatorProps {
  date: Date
  isDark: boolean
}

export function DaySeparator({ date, isDark }: DaySeparatorProps) {
  const label = formatDayLabel(date)
  const lineColor = isDark ? 'rgba(255,255,255,0.10)' : '#D8D1BE'
  const textColor = isDark ? 'rgba(236,227,203,0.55)' : '#574B33'
  const pillBg = isDark ? 'rgba(13,11,20,0.7)' : '#F5F2E8'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '20px 0 12px',
      paddingInline: 16,
    }}>
      <div style={{ flex: 1, height: 1, background: lineColor }} />
      <div style={{
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: textColor,
        background: pillBg,
        padding: '4px 12px',
        borderRadius: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: lineColor }} />
    </div>
  )
}
