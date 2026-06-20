import { isWRIReaction, userHasReacted, WRI_GOLD, type ReactionMessage, type WRIReactionType } from '@/lib/wri-reactions'
import { WRI_ICONS } from '@/components/chat/icons/WRIReactionIcons'

interface WRIReactionListProps {
  message: ReactionMessage
  currentUserId: string
  onToggle: (type: WRIReactionType, hasMine: boolean) => void
  isDark?: boolean
}

export function WRIReactionList({ message, currentUserId, onToggle, isDark = true }: WRIReactionListProps) {
  const counts = message.reaction_counts ?? {}
  // Only WRI reactions render here. Legacy/default reaction types on older
  // messages are intentionally ignored (not rendered, not deleted).
  const entries = Object.entries(counts).filter(([type, count]) => count > 0 && isWRIReaction(type))
  if (entries.length === 0) return null

  const mutedBdr = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const txt = isDark ? '#d8cdb4' : '#3a342b'

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
      {entries.map(([type, count]) => {
        const t = type as WRIReactionType
        const Icon = WRI_ICONS[t]
        const mine = userHasReacted(message, type, currentUserId)
        return (
          <button
            key={type}
            onClick={() => onToggle(t, mine)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: mine ? 'rgba(201,168,76,0.16)' : 'rgba(201,168,76,0.06)',
              border: `1px solid ${mine ? WRI_GOLD : mutedBdr}`,
              borderRadius: 12,
              padding: '2px 8px',
              cursor: 'pointer',
              color: WRI_GOLD,
            }}
          >
            <Icon size={16} color={WRI_GOLD} />
            <span style={{ fontSize: 11, color: mine ? WRI_GOLD : txt, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
