import { useState, useRef } from 'react'

interface SpiritTagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  readOnly?: boolean
  disabled?: boolean
  style?: React.CSSProperties
}

export function SpiritTagEditor({ tags, onChange, readOnly, disabled, style }: SpiritTagEditorProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(raw: string) {
    // Allow comma-separated paste
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...tags]
    for (const p of parts) {
      if (!next.includes(p)) next.push(p)
    }
    onChange(next.slice(0, 10))
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  const isInteractive = !readOnly && !disabled

  return (
    <div
      onClick={() => isInteractive && inputRef.current?.focus()}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5,
        alignItems: 'center',
        minHeight: 32,
        padding: '4px 8px',
        background: isInteractive ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: isInteractive ? '1px solid rgba(201,168,76,0.2)' : 'none',
        borderRadius: 6,
        cursor: isInteractive ? 'text' : 'default',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {tags.map(tag => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.38)',
            color: '#C9A84C',
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.04em',
            lineHeight: 1.4,
            whiteSpace: 'nowrap' as const,
          }}
        >
          {tag}
          {isInteractive && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(201,168,76,0.55)',
                fontSize: 13,
                padding: 0,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
              }}
              title={`Remove ${tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {isInteractive && (
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              if (input.trim()) commit(input)
            } else if (e.key === 'Backspace' && !input && tags.length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          onBlur={() => { if (input.trim()) commit(input) }}
          placeholder={tags.length === 0 ? 'Add spirit...' : ''}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#C9A84C',
            fontFamily: "'Crimson Text', serif",
            fontSize: 12,
            padding: '2px 2px',
            minWidth: 80,
            flex: '1 1 80px',
          }}
        />
      )}

      {tags.length === 0 && readOnly && (
        <span style={{ fontFamily: "'Crimson Text', serif", fontSize: 12, color: 'rgba(154,140,116,0.5)', fontStyle: 'italic' }}>
          None tagged
        </span>
      )}
    </div>
  )
}
