import { getTriageStatus, getAttested, getCompleteness, getRefsCount, type LesLike } from '../lib/triage'

/**
 * Compact inline badges for an LES row.
 *
 * Renders triage status, source class, scripture density. Read-only;
 * no interaction. Operator scans the queue at-a-glance.
 */
export interface TriageBadgesProps {
  les: LesLike
  compact?: boolean
}

export function TriageBadges({ les, compact }: TriageBadgesProps) {
  const status = getTriageStatus(les)
  const att    = getAttested(les)
  const comp   = getCompleteness(les)
  const refs   = getRefsCount(les)
  const adv    = les.is_adversarial

  const statusBadge =
    status === 'ready'            ? { icon: '🟢', text: compact ? 'ready' : 'ready (fast-approve)' } :
    status === 'needs-read'       ? { icon: '🟡', text: compact ? 'read' : 'needs read' } :
    status === 'reject-candidate' ? { icon: '🔴', text: compact ? 'reject?' : 'reject candidate' } :
    status === 'unknown'          ? { icon: '⚪', text: compact ? 'legacy' : 'no _meta (legacy)' } :
    null

  const sourceBadge =
    adv === true  ? { icon: '🕯️', text: compact ? 'intel' : 'intelligence only' } :
    adv === false ? { icon: '📖', text: compact ? 'min'   : 'ministry source' } :
    null

  const completenessText =
    comp === 'substantial' ? 'subst.' :
    comp === 'partial'     ? 'partial' :
    comp === 'minimal'     ? 'min.' :
    null

  const style: React.CSSProperties = {
    display: 'inline-flex',
    gap: compact ? 4 : 8,
    alignItems: 'center',
    fontSize: compact ? 11 : 12,
    flexWrap: 'wrap',
  }

  const badgeBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    padding: compact ? '1px 5px' : '2px 7px',
    borderRadius: 4,
    background: 'rgba(0,0,0,0.04)',
    whiteSpace: 'nowrap',
  }

  return (
    <span style={style} title={`attested=${att}, completeness=${comp}, refs=${refs}, adversarial=${adv}`}>
      {statusBadge && (
        <span style={badgeBase}>{statusBadge.icon} {statusBadge.text}</span>
      )}
      {completenessText && (
        <span style={badgeBase}>{completenessText}</span>
      )}
      {refs > 0 && (
        <span style={badgeBase}>✨ {refs}</span>
      )}
      {sourceBadge && (
        <span style={badgeBase}>{sourceBadge.icon} {sourceBadge.text}</span>
      )}
    </span>
  )
}
