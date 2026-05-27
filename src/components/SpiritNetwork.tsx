import { useState, useEffect, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const cinzel = "'Cinzel', serif"
const inter  = 'Inter, system-ui, sans-serif'

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface Demon {
  id: number
  name: string
  aka?: string
  kingdom?: string
  subKingdom?: string
  biblicalRank?: string
  hierarchyCategory?: string
  parentStrongman?: string
  companionSpirits?: string
  description?: string
  assignment?: string
  entryPoints?: string
  legalRights?: string
  deliveranceSequence?: string
  sessionIndicators?: string
  primaryBattlefield?: string
  isGenerational?: boolean
  isTerritorial?: boolean
  caseType?: string
  phonetic?: string
  scripture?: string
  wriNotes?: string
  prayerPoints?: string
}

export interface SpiritNetworkProps {
  demons: Demon[]
  isDark: boolean
  isMobile: boolean
  userTier?: string
  userId?: string
  onNavigateTo?: (section: string) => void
}

// ── CUSTOM NODE ────────────────────────────────────────────────────────────────

function SpiritNodeComponent({ data }: { data: any }) {
  const rank = String(data.rank || '').toLowerCase()
  const borderColor = data.selected
    ? '#C9A84C'
    : data.dim
    ? '#1a1520'
    : rank.includes('principality') ? '#8B0000'
    : rank.includes('power') ? '#4a1a6a'
    : rank.includes('strongman') ? '#9a7a3a'
    : '#2a2035'

  return (
    <div
      style={{
        width: 160,
        height: 60,
        background: data.selected
          ? 'radial-gradient(ellipse at center, #1a1020 0%, #09070F 100%)'
          : '#09070F',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: data.clickable !== false ? 'pointer' : 'default',
        boxShadow: data.selected
          ? '0 0 30px rgba(201,168,76,0.2), inset 0 0 20px rgba(201,168,76,0.05)'
          : 'none',
        opacity: data.dim ? 0.4 : 1,
        padding: '8px 12px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#2a2035', border: 'none', width: 6, height: 6 }}
      />
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 11,
          color: data.selected ? '#C9A84C' : data.dim ? '#3a3050' : '#8a7a9a',
          letterSpacing: '0.06em',
          textAlign: 'center' as const,
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 140,
        }}
      >
        {String(data.name || '')}
      </div>
      {data.kingdom && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 9,
            color: data.dim ? '#2a2035' : '#4a3f5a',
            marginTop: 3,
            letterSpacing: '0.05em',
          }}
        >
          {String(data.kingdom)}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#2a2035', border: 'none', width: 6, height: 6 }}
      />
    </div>
  )
}

const NODE_TYPES: NodeTypes = { spiritNode: SpiritNodeComponent }

// ── GRAPH BUILDER ──────────────────────────────────────────────────────────────

function buildGraph(
  spirit: Demon,
  allDemons: Demon[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const cx = 300
  const hasParent = !!spirit.parentStrongman

  const companions = spirit.companionSpirits
    ? String(spirit.companionSpirits)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  if (hasParent) {
    const parent = allDemons.find(
      d => d.name.toLowerCase() === (spirit.parentStrongman || '').toLowerCase()
    )
    nodes.push({
      id: 'parent',
      type: 'spiritNode',
      position: { x: cx - 80, y: 30 },
      data: {
        name: spirit.parentStrongman,
        kingdom: parent?.kingdom || '',
        rank: parent?.biblicalRank || parent?.hierarchyCategory || '',
        dim: !parent,
        clickable: !!parent,
        demonRef: parent || null,
      },
    })
    edges.push({
      id: 'e-parent-sel',
      source: 'parent',
      target: 'selected',
      animated: true,
      style: { stroke: '#8B0000', strokeDasharray: '5,5', strokeWidth: 2 },
    })
  }

  nodes.push({
    id: 'selected',
    type: 'spiritNode',
    position: { x: cx - 80, y: hasParent ? 160 : 40 },
    data: {
      name: spirit.name,
      kingdom: spirit.kingdom || '',
      rank: spirit.biblicalRank || spirit.hierarchyCategory || '',
      selected: true,
      clickable: true,
      demonRef: spirit,
    },
  })

  const totalW = companions.length * 180
  const startX = cx - totalW / 2 + 10

  companions.forEach((name, i) => {
    const found = allDemons.find(
      d => d.name.toLowerCase() === name.toLowerCase()
    )
    const nodeId = `comp-${i}`
    nodes.push({
      id: nodeId,
      type: 'spiritNode',
      position: { x: startX + i * 180, y: hasParent ? 310 : 200 },
      data: {
        name,
        kingdom: found?.kingdom || '',
        rank: found?.biblicalRank || found?.hierarchyCategory || '',
        dim: !found,
        clickable: !!found,
        demonRef: found || null,
      },
    })
    edges.push({
      id: `e-sel-${nodeId}`,
      source: 'selected',
      target: nodeId,
      animated: !!found,
      style: {
        stroke: found ? '#C9A84C' : '#2a2035',
        strokeWidth: found ? 1.5 : 1,
        strokeDasharray: found ? undefined : '4,4',
      },
    })
  })

  return { nodes, edges }
}

// ── EMPTY CANVAS ───────────────────────────────────────────────────────────────

function EmptyCanvas({
  onSelectSpirit,
  demons,
}: {
  onSelectSpirit: (d: Demon) => void
  demons: Demon[]
}) {
  const quickStart = ['Leviathan', 'Baal', 'Jezebel']
    .map(name => demons.find(d => d.name === name))
    .filter((d): d is Demon => !!d)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09070F',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 48, color: '#C9A84C', opacity: 0.25 }}>⚔</div>
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 14,
          color: '#C9A84C',
          letterSpacing: '0.15em',
          textAlign: 'center' as const,
        }}
      >
        SPIRIT NETWORK COMMAND CENTER
      </div>
      <div
        style={{
          fontFamily: inter,
          fontSize: 13,
          color: '#4a3f5a',
          textAlign: 'center' as const,
        }}
      >
        Search for a spirit to begin investigation
      </div>
      {quickStart.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {quickStart.map(d => (
            <button
              key={d.id}
              onClick={() => onSelectSpirit(d)}
              style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: 6,
                padding: '8px 16px',
                cursor: 'pointer',
                fontFamily: cinzel,
                fontSize: 10,
                color: '#C9A84C',
                letterSpacing: '0.08em',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')
              }
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── RIGHT DRAWER ───────────────────────────────────────────────────────────────

function RightDrawer({
  spirit,
  resources,
  loadingResources,
  onClose,
}: {
  spirit: Demon
  resources: any[]
  loadingResources: boolean
  onClose: () => void
}) {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto' as const,
        padding: 20,
        position: 'relative' as const,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute' as const,
          top: 12,
          right: 12,
          background: 'transparent',
          border: 'none',
          color: '#4a3f5a',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <div
        style={{
          fontFamily: cinzel,
          fontSize: 11,
          color: '#C9A84C',
          letterSpacing: '0.1em',
          marginBottom: 16,
          paddingRight: 24,
        }}
      >
        {spirit.name}
      </div>

      {spirit.scripture && (
        <section style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: cinzel,
              fontSize: 8,
              color: '#C9A84C',
              letterSpacing: '0.14em',
              marginBottom: 8,
            }}
          >
            📖 SCRIPTURES
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 12,
              color: '#6a5a7a',
              lineHeight: 1.6,
            }}
          >
            {spirit.scripture}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 20 }}>
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 8,
            color: '#C9A84C',
            letterSpacing: '0.14em',
            marginBottom: 10,
          }}
        >
          🧠 GATEWAY INTEL
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ fontFamily: inter, fontSize: 11, color: '#4a3f5a' }}
            >
              Generational:
            </span>
            <span
              style={{
                fontFamily: inter,
                fontSize: 10,
                padding: '1px 8px',
                borderRadius: 10,
                background: spirit.isGenerational
                  ? 'rgba(248,113,113,0.1)'
                  : 'rgba(255,255,255,0.03)',
                color: spirit.isGenerational ? '#f87171' : '#4a3f5a',
                border: `1px solid ${spirit.isGenerational ? 'rgba(248,113,113,0.3)' : '#2a2035'}`,
              }}
            >
              {spirit.isGenerational ? 'Yes' : 'No'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{ fontFamily: inter, fontSize: 11, color: '#4a3f5a' }}
            >
              Territorial:
            </span>
            <span
              style={{
                fontFamily: inter,
                fontSize: 10,
                padding: '1px 8px',
                borderRadius: 10,
                background: spirit.isTerritorial
                  ? 'rgba(251,191,36,0.1)'
                  : 'rgba(255,255,255,0.03)',
                color: spirit.isTerritorial ? '#fbbf24' : '#4a3f5a',
                border: `1px solid ${spirit.isTerritorial ? 'rgba(251,191,36,0.3)' : '#2a2035'}`,
              }}
            >
              {spirit.isTerritorial ? 'Yes' : 'No'}
            </span>
          </div>
          {spirit.primaryBattlefield && (
            <div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  color: '#4a3f5a',
                  marginBottom: 2,
                }}
              >
                Battlefield
              </div>
              <div
                style={{ fontFamily: inter, fontSize: 12, color: '#8a7a6a' }}
              >
                {spirit.primaryBattlefield}
              </div>
            </div>
          )}
        </div>
      </section>

      {(loadingResources || resources.length > 0) && (
        <section style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: cinzel,
              fontSize: 8,
              color: '#C9A84C',
              letterSpacing: '0.14em',
              marginBottom: 10,
            }}
          >
            📜 RELATED DOCUMENTS
          </div>
          {loadingResources ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
              }}
            >
              {[80, 60, 70].map((w, i) => (
                <div
                  key={i}
                  style={{
                    height: 12,
                    background: '#1a1520',
                    borderRadius: 4,
                    width: `${w}%`,
                  }}
                />
              ))}
            </div>
          ) : (
            resources.map((r: any) => (
              <div
                key={r.id}
                style={{
                  borderLeft: '2px solid rgba(201,168,76,0.3)',
                  paddingLeft: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: cinzel,
                    fontSize: 10,
                    color: '#c8b99a',
                    letterSpacing: '0.04em',
                    marginBottom: 1,
                  }}
                >
                  {r.title}
                </div>
                {r.topic && (
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      color: '#4a3f5a',
                    }}
                  >
                    {r.topic}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}
    </div>
  )
}

// ── DOSSIER MODE ───────────────────────────────────────────────────────────────

function DossierMode({
  spirit,
  demons,
  resources,
  loadingResources,
  onSelectSpirit,
}: {
  spirit: Demon
  demons: Demon[]
  resources: any[]
  loadingResources: boolean
  onSelectSpirit: (d: Demon) => void
}) {
  const companions = spirit.companionSpirits
    ? String(spirit.companionSpirits)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  const rank = (spirit.biblicalRank || '').toLowerCase()
  const rankColor = rank.includes('principality')
    ? '#8B0000'
    : rank.includes('power')
    ? '#9b59b6'
    : rank.includes('strongman')
    ? '#C9A84C'
    : '#4a3f5a'

  const tacticalRows = [
    { label: 'Kingdom', value: spirit.kingdom },
    { label: 'Sub-Kingdom', value: spirit.subKingdom },
    { label: 'Biblical Rank', value: spirit.biblicalRank },
    { label: 'Case Type', value: spirit.caseType },
    { label: 'Battlefield', value: spirit.primaryBattlefield },
    {
      label: 'Generational',
      value:
        spirit.isGenerational === true
          ? 'Yes'
          : spirit.isGenerational === false
          ? 'No'
          : null,
    },
    {
      label: 'Territorial',
      value:
        spirit.isTerritorial === true
          ? 'Yes'
          : spirit.isTerritorial === false
          ? 'No'
          : null,
    },
    { label: 'Parent Strongman', value: spirit.parentStrongman },
  ].filter(r => r.value)

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto' as const,
        background: '#09070F',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: cinzel,
                  fontSize: 32,
                  color: '#C9A84C',
                  letterSpacing: '0.06em',
                  lineHeight: 1.1,
                  marginBottom: 6,
                }}
              >
                {spirit.name}
              </div>
              {spirit.phonetic && (
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 13,
                    color: '#4a3f5a',
                    fontStyle: 'italic',
                    marginBottom: 4,
                  }}
                >
                  {spirit.phonetic}
                </div>
              )}
              {spirit.aka && (
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 13,
                    color: '#4a3f5a',
                    fontStyle: 'italic',
                  }}
                >
                  Also known as: {spirit.aka}
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 6,
                flexShrink: 0,
              }}
            >
              {spirit.biblicalRank && (
                <span
                  style={{
                    fontFamily: cinzel,
                    fontSize: 9,
                    color: rankColor,
                    border: `1px solid ${rankColor}`,
                    borderRadius: 4,
                    padding: '3px 10px',
                    letterSpacing: '0.1em',
                    textAlign: 'center' as const,
                  }}
                >
                  {spirit.biblicalRank}
                </span>
              )}
              {spirit.kingdom && (
                <span
                  style={{
                    fontFamily: cinzel,
                    fontSize: 9,
                    color: '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.4)',
                    borderRadius: 4,
                    padding: '3px 10px',
                    letterSpacing: '0.1em',
                    textAlign: 'center' as const,
                  }}
                >
                  {spirit.kingdom}
                </span>
              )}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a1520' }} />
        </div>

        {/* Executive Summary */}
        {spirit.description && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              EXECUTIVE SUMMARY
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 15,
                color: '#c8b99a',
                lineHeight: 1.85,
              }}
            >
              {spirit.description}
            </div>
          </section>
        )}

        {/* Tactical data */}
        {tacticalRows.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              TACTICAL DATA
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              {tacticalRows.map(({ label, value }) => (
                <div
                  key={label}
                  style={{ borderLeft: '2px solid #1a1520', paddingLeft: 12 }}
                >
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      color: '#4a3f5a',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.08em',
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 14,
                      color: '#c8b99a',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Companion spirits */}
        {companions.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              COMPANION SPIRITS
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap' as const,
                gap: 8,
              }}
            >
              {companions.map(name => {
                const found = demons.find(
                  d => d.name.toLowerCase() === name.toLowerCase()
                )
                return (
                  <button
                    key={name}
                    onClick={() => found && onSelectSpirit(found)}
                    style={{
                      background: 'rgba(201,168,76,0.06)',
                      border: `1px solid ${found ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.18)'}`,
                      borderRadius: 20,
                      padding: '6px 14px',
                      cursor: found ? 'pointer' : 'default',
                      fontFamily: cinzel,
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      color: found ? '#C9A84C' : '#4a3f5a',
                    }}
                    onMouseEnter={e => {
                      if (found)
                        e.currentTarget.style.background =
                          'rgba(201,168,76,0.14)'
                    }}
                    onMouseLeave={e => {
                      if (found)
                        e.currentTarget.style.background =
                          'rgba(201,168,76,0.06)'
                    }}
                  >
                    {found ? '⚔ ' : ''}
                    {name}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Entry points / Legal grounds */}
        {(spirit.entryPoints || spirit.legalRights) && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              ENTRY POINTS / LEGAL GROUNDS
            </div>
            {spirit.entryPoints && (
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 14,
                  color: '#c8b99a',
                  lineHeight: 1.8,
                  marginBottom: spirit.legalRights ? 10 : 0,
                }}
              >
                {spirit.entryPoints}
              </div>
            )}
            {spirit.legalRights && (
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 14,
                  color: '#c8b99a',
                  lineHeight: 1.8,
                }}
              >
                {spirit.legalRights}
              </div>
            )}
          </section>
        )}

        {/* Deliverance sequence */}
        {spirit.deliveranceSequence && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              DELIVERANCE SEQUENCE
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 14,
                color: '#c8b99a',
                lineHeight: 1.9,
              }}
            >
              {spirit.deliveranceSequence}
            </div>
          </section>
        )}

        {/* Session indicators */}
        {spirit.sessionIndicators && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              SESSION INDICATORS
            </div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 14,
                color: '#c8b99a',
                lineHeight: 1.9,
              }}
            >
              {spirit.sessionIndicators}
            </div>
          </section>
        )}

        {/* Resources */}
        {(resources.length > 0 || loadingResources) && (
          <section style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#C9A84C',
                letterSpacing: '0.14em',
                marginBottom: 14,
              }}
            >
              RELATED RESOURCES
            </div>
            {loadingResources ? (
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 13,
                  color: '#4a3f5a',
                  fontStyle: 'italic',
                }}
              >
                Loading resources…
              </div>
            ) : (
              resources.map((r: any) => (
                <div
                  key={r.id}
                  style={{
                    borderLeft: '2px solid rgba(201,168,76,0.3)',
                    paddingLeft: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: cinzel,
                      fontSize: 11,
                      color: '#c8b99a',
                      marginBottom: 2,
                    }}
                  >
                    {r.title}
                  </div>
                  {r.topic && (
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 11,
                        color: '#4a3f5a',
                      }}
                    >
                      {r.topic}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {/* Gateway button */}
        <button
          style={{
            width: '100%',
            padding: 14,
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: 8,
            color: '#C9A84C',
            fontFamily: cinzel,
            fontSize: 11,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            marginBottom: 40,
          }}
          onMouseEnter={e =>
            (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')
          }
          onMouseLeave={e =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          🚪 RUN GATEWAY ANALYSIS — {spirit.name.toUpperCase()}
        </button>
      </div>
    </div>
  )
}

// ── MOBILE DOSSIER ─────────────────────────────────────────────────────────────

function MobileDossier({
  spirit,
  demons,
  resources,
  loadingResources,
  onSelectSpirit,
  onBack,
}: {
  spirit: Demon
  demons: Demon[]
  resources: any[]
  loadingResources: boolean
  onSelectSpirit: (d: Demon) => void
  onBack: () => void
}) {
  const companions = spirit.companionSpirits
    ? String(spirit.companionSpirits)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'transparent',
          border: '1px solid #2a2035',
          borderRadius: 6,
          color: '#4a3f5a',
          fontFamily: cinzel,
          fontSize: 9,
          padding: '6px 14px',
          cursor: 'pointer',
          marginBottom: 16,
          letterSpacing: '0.08em',
        }}
      >
        ← BACK
      </button>

      <div
        style={{
          fontFamily: cinzel,
          fontSize: 22,
          color: '#C9A84C',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}
      >
        {spirit.name}
      </div>
      {spirit.kingdom && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 11,
            color: '#4a3f5a',
            marginBottom: 12,
          }}
        >
          {spirit.kingdom}
        </div>
      )}
      {spirit.description && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 14,
            color: '#c8b99a',
            lineHeight: 1.7,
            marginBottom: 20,
          }}
        >
          {spirit.description}
        </div>
      )}

      {companions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: cinzel,
              fontSize: 8,
              color: '#C9A84C',
              letterSpacing: '0.14em',
              marginBottom: 10,
            }}
          >
            COMPANION SPIRITS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {companions.map(name => {
              const found = demons.find(
                d => d.name.toLowerCase() === name.toLowerCase()
              )
              return (
                <button
                  key={name}
                  onClick={() => found && onSelectSpirit(found)}
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: `1px solid ${found ? 'rgba(201,168,76,0.5)' : '#2a2035'}`,
                    borderRadius: 20,
                    padding: '5px 12px',
                    cursor: found ? 'pointer' : 'default',
                    fontFamily: cinzel,
                    fontSize: 9,
                    color: found ? '#C9A84C' : '#4a3f5a',
                  }}
                >
                  {found ? '⚔ ' : ''}
                  {name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {spirit.deliveranceSequence && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: cinzel,
              fontSize: 8,
              color: '#C9A84C',
              letterSpacing: '0.14em',
              marginBottom: 8,
            }}
          >
            DELIVERANCE SEQUENCE
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 13,
              color: '#c8b99a',
              lineHeight: 1.7,
            }}
          >
            {spirit.deliveranceSequence}
          </div>
        </div>
      )}

      {(resources.length > 0 || loadingResources) && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: cinzel,
              fontSize: 8,
              color: '#C9A84C',
              letterSpacing: '0.14em',
              marginBottom: 8,
            }}
          >
            RESOURCES
          </div>
          {loadingResources ? (
            <div style={{ fontFamily: inter, fontSize: 12, color: '#4a3f5a' }}>
              Loading…
            </div>
          ) : (
            resources.map((r: any) => (
              <div
                key={r.id}
                style={{
                  borderLeft: '2px solid rgba(201,168,76,0.3)',
                  paddingLeft: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: cinzel,
                    fontSize: 10,
                    color: '#c8b99a',
                  }}
                >
                  {r.title}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── MOBILE EXPLORER ────────────────────────────────────────────────────────────

function MobileExplorer({
  demons,
  kingdoms,
  groupedByKingdom,
  onSelect,
}: {
  demons: Demon[]
  kingdoms: string[]
  groupedByKingdom: Record<string, Demon[]>
  onSelect: (d: Demon) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  return (
    <div>
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 9,
          color: '#C9A84C',
          letterSpacing: '0.14em',
          marginBottom: 12,
        }}
      >
        {demons.length} SPIRITS IN DATABASE
      </div>
      {kingdoms.map(k => {
        const spirits = groupedByKingdom[k] || []
        const isOpen = !collapsed.has(k)
        return (
          <div key={k} style={{ marginBottom: 4 }}>
            <button
              onClick={() =>
                setCollapsed(prev => {
                  const n = new Set(prev)
                  n.has(k) ? n.delete(k) : n.add(k)
                  return n
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #1a1520',
                cursor: 'pointer',
                textAlign: 'left' as const,
              }}
            >
              <span
                style={{
                  fontFamily: cinzel,
                  fontSize: 10,
                  color: '#C9A84C',
                  letterSpacing: '0.1em',
                  flex: 1,
                  textTransform: 'uppercase' as const,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  color: '#4a3f5a',
                }}
              >
                {spirits.length}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: '#4a3f5a',
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.15s',
                }}
              >
                ›
              </span>
            </button>
            {isOpen && (
              <div style={{ paddingTop: 4 }}>
                {spirits.map(d => (
                  <button
                    key={d.id}
                    onClick={() => onSelect(d)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 0 8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderLeft: '2px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.borderLeftColor = '#C9A84C')
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.borderLeftColor = 'transparent')
                    }
                  >
                    <span
                      style={{
                        fontFamily: inter,
                        fontSize: 13,
                        color: '#8a7a6a',
                      }}
                    >
                      {d.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

const KINGDOM_ORDER = [
  'Hell',
  'Darkness',
  'Air',
  'Water',
  'Earth',
  'Witchcraft',
  'Occult',
]

export function SpiritNetwork({
  demons,
  isMobile,
}: SpiritNetworkProps) {
  const [selectedSpirit, setSelectedSpirit] = useState<Demon | null>(null)
  const [mode, setMode] = useState<'network' | 'dossier'>('network')
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dossierExpanded, setDossierExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSpirits, setRecentSpirits] = useState<Demon[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [collapsedKingdoms, setCollapsedKingdoms] = useState<Set<string>>(
    new Set()
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const searchResults =
    searchQuery.length > 1
      ? demons
          .filter(d =>
            d.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 8)
      : []

  const selectSpirit = useCallback(
    (demon: Demon) => {
      setSelectedSpirit(demon)
      setDrawerOpen(true)
      setDossierExpanded(false)
      setRecentSpirits(prev =>
        [demon, ...prev.filter(d => d.id !== demon.id)].slice(0, 5)
      )
      setResources([])
      setLoadingResources(true)
      fetch(`/api/spirit-resources?spirit=${encodeURIComponent(demon.name)}`)
        .then(r => r.json())
        .then(d => {
          setResources(d.resources || [])
          setLoadingResources(false)
        })
        .catch(() => {
          setResources([])
          setLoadingResources(false)
        })
    },
    []
  )

  useEffect(() => {
    if (!selectedSpirit) {
      setNodes([])
      setEdges([])
      return
    }
    const { nodes: n, edges: e } = buildGraph(selectedSpirit, demons)
    setNodes(n)
    setEdges(e)
  }, [selectedSpirit?.id, demons.length])

  const groupedByKingdom = demons.reduce(
    (acc: Record<string, Demon[]>, d) => {
      const k = d.kingdom || 'Other'
      if (!acc[k]) acc[k] = []
      acc[k].push(d)
      return acc
    },
    {}
  )

  const kingdoms = Object.keys(groupedByKingdom).sort((a, b) => {
    const ai = KINGDOM_ORDER.indexOf(a)
    const bi = KINGDOM_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const companionNames = selectedSpirit
    ? String(selectedSpirit.companionSpirits || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []

  // ── MOBILE ───────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        style={{
          flex: 1,
          overflowY: 'auto' as const,
          background: '#09070F',
          padding: 16,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search spirits…"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#0f0b17',
              border: '1px solid #2a2035',
              borderRadius: 6,
              color: '#c8b99a',
              fontFamily: inter,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box' as const,
            }}
          />
          {searchQuery && searchResults.length > 0 && (
            <div
              style={{
                background: '#0f0b17',
                border: '1px solid #2a2035',
                borderRadius: 6,
                marginTop: 4,
              }}
            >
              {searchResults.map(d => (
                <div
                  key={d.id}
                  onClick={() => {
                    selectSpirit(d)
                    setSearchQuery('')
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #1a1520',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 13,
                      color: '#c8b99a',
                      flex: 1,
                    }}
                  >
                    {d.name}
                  </span>
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      color: '#4a3f5a',
                      background: '#1a1520',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {d.kingdom}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedSpirit ? (
          <MobileDossier
            spirit={selectedSpirit}
            demons={demons}
            resources={resources}
            loadingResources={loadingResources}
            onSelectSpirit={selectSpirit}
            onBack={() => setSelectedSpirit(null)}
          />
        ) : (
          <MobileExplorer
            demons={demons}
            kingdoms={kingdoms}
            groupedByKingdom={groupedByKingdom}
            onSelect={selectSpirit}
          />
        )}
      </div>
    )
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        background: '#09070F',
        overflow: 'hidden',
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
          borderBottom: '1px solid #1a1520',
          background: '#09070F',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: cinzel,
            fontSize: 13,
            color: '#C9A84C',
            letterSpacing: '0.15em',
            flexShrink: 0,
          }}
        >
          SPIRIT NETWORK
        </span>

        {/* Search */}
        <div
          style={{
            position: 'relative' as const,
            flex: 1,
            maxWidth: 400,
          }}
        >
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search spirits..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: '#0f0b17',
              border: '1px solid #2a2035',
              borderRadius: 6,
              color: '#c8b99a',
              fontFamily: inter,
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box' as const,
            }}
            onFocus={e => (e.target.style.borderColor = '#C9A84C')}
            onBlur={e => (e.target.style.borderColor = '#2a2035')}
          />
          <span
            style={{
              position: 'absolute' as const,
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#4a3f5a',
              fontSize: 14,
              pointerEvents: 'none' as const,
            }}
          >
            🔍
          </span>
          {searchQuery && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute' as const,
                top: '100%',
                left: 0,
                right: 0,
                background: '#0f0b17',
                border: '1px solid #2a2035',
                borderRadius: 6,
                marginTop: 4,
                zIndex: 100,
                maxHeight: 280,
                overflowY: 'auto' as const,
              }}
            >
              {searchResults.map(d => (
                <div
                  key={d.id}
                  onClick={() => {
                    selectSpirit(d)
                    setSearchQuery('')
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #1a1520',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = '#1a1528')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 13,
                      color: '#c8b99a',
                      flex: 1,
                    }}
                  >
                    {d.name}
                  </span>
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      color: '#4a3f5a',
                      background: '#1a1520',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {d.kingdom}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: '#0f0b17',
            border: '1px solid #2a2035',
            borderRadius: 6,
            padding: 3,
            flexShrink: 0,
          }}
        >
          {(['network', 'dossier'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '5px 14px',
                borderRadius: 4,
                border: 'none',
                background:
                  mode === m ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: mode === m ? '#C9A84C' : '#4a3f5a',
                fontFamily: cinzel,
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                textTransform: 'uppercase' as const,
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Explorer toggle */}
        <button
          onClick={() => setExplorerOpen(o => !o)}
          style={{
            background: 'transparent',
            border: '1px solid #2a2035',
            borderRadius: 4,
            color: '#4a3f5a',
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: cinzel,
            fontSize: 9,
            letterSpacing: '0.1em',
            flexShrink: 0,
            whiteSpace: 'nowrap' as const,
          }}
        >
          {explorerOpen ? '◀ HIDE' : '▶ EXPLORER'}
        </button>
      </div>

      {/* MAIN AREA */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* LEFT EXPLORER */}
        <div
          style={{
            width: explorerOpen ? 220 : 0,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 200ms ease',
            background: '#09070F',
            borderRight: explorerOpen ? '1px solid #1a1520' : 'none',
            display: 'flex',
            flexDirection: 'column' as const,
          }}
        >
          <div
            style={{
              overflowY: 'auto' as const,
              flex: 1,
              paddingBottom: 12,
            }}
          >
            <div
              style={{
                padding: '12px 12px 6px',
                fontFamily: cinzel,
                fontSize: 8,
                color: '#C9A84C',
                letterSpacing: '0.14em',
              }}
            >
              KINGDOMS
            </div>
            {kingdoms.map(kingdom => {
              const spirits = groupedByKingdom[kingdom] || []
              const isOpen = !collapsedKingdoms.has(kingdom)
              return (
                <div key={kingdom}>
                  <button
                    onClick={() =>
                      setCollapsedKingdoms(prev => {
                        const n = new Set(prev)
                        n.has(kingdom) ? n.delete(kingdom) : n.add(kingdom)
                        return n
                      })
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                      padding: '5px 12px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: cinzel,
                        fontSize: 8,
                        letterSpacing: '0.12em',
                        color: '#C9A84C',
                        flex: 1,
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      {kingdom}
                    </span>
                    <span
                      style={{
                        fontFamily: inter,
                        fontSize: 9,
                        color: '#4a3f5a',
                      }}
                    >
                      {spirits.length}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#4a3f5a',
                        display: 'inline-block',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    >
                      ›
                    </span>
                  </button>
                  {isOpen &&
                    spirits.map(d => (
                      <button
                        key={d.id}
                        onClick={() => selectSpirit(d)}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '4px 16px 4px 20px',
                          background:
                            selectedSpirit?.id === d.id
                              ? 'rgba(201,168,76,0.1)'
                              : 'transparent',
                          borderLeft: `2px solid ${selectedSpirit?.id === d.id ? '#C9A84C' : 'transparent'}`,
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                        }}
                        onMouseEnter={e => {
                          if (selectedSpirit?.id !== d.id)
                            e.currentTarget.style.background =
                              'rgba(201,168,76,0.05)'
                        }}
                        onMouseLeave={e => {
                          if (selectedSpirit?.id !== d.id)
                            e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: cinzel,
                            fontSize: 9,
                            color:
                              selectedSpirit?.id === d.id
                                ? '#C9A84C'
                                : '#6a5a7a',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {d.name}
                        </span>
                      </button>
                    ))}
                </div>
              )
            })}

            {recentSpirits.length > 0 && (
              <>
                <div
                  style={{
                    padding: '14px 12px 6px',
                    fontFamily: cinzel,
                    fontSize: 8,
                    color: '#4a3f5a',
                    letterSpacing: '0.14em',
                    borderTop: '1px solid #1a1520',
                    marginTop: 8,
                  }}
                >
                  RECENT
                </div>
                {recentSpirits.map(d => (
                  <button
                    key={`recent-${d.id}`}
                    onClick={() => selectSpirit(d)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '4px 16px 4px 14px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.background =
                        'rgba(201,168,76,0.05)')
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <span
                      style={{
                        fontFamily: inter,
                        fontSize: 11,
                        color: '#6a5a7a',
                      }}
                    >
                      {d.name}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div
          style={{
            flex: 1,
            position: 'relative' as const,
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {mode === 'network' ? (
            selectedSpirit ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => {
                  const ref = (node.data as any).demonRef as Demon | null
                  if (ref) selectSpirit(ref)
                }}
                nodeTypes={NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                style={{ background: '#09070F' }}
              >
                <Background
                  color="#1a1520"
                  gap={32}
                  size={1}
                  variant={BackgroundVariant.Dots}
                />
                <Controls
                  style={{
                    background: '#0f0b17',
                    border: '1px solid #2a2035',
                  }}
                />
                <MiniMap
                  style={{
                    background: '#09070F',
                    border: '1px solid #1a1520',
                  }}
                  nodeColor="#2a2035"
                />
              </ReactFlow>
            ) : (
              <EmptyCanvas onSelectSpirit={selectSpirit} demons={demons} />
            )
          ) : selectedSpirit ? (
            <DossierMode
              spirit={selectedSpirit}
              demons={demons}
              resources={resources}
              loadingResources={loadingResources}
              onSelectSpirit={selectSpirit}
            />
          ) : (
            <EmptyCanvas onSelectSpirit={selectSpirit} demons={demons} />
          )}
        </div>

        {/* RIGHT DRAWER */}
        <div
          style={{
            width: drawerOpen && selectedSpirit ? 280 : 0,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 250ms ease',
            background: '#09070F',
            borderLeft:
              drawerOpen && selectedSpirit ? '1px solid #1a1520' : 'none',
            display: 'flex',
            flexDirection: 'column' as const,
          }}
        >
          {selectedSpirit && drawerOpen && (
            <RightDrawer
              spirit={selectedSpirit}
              resources={resources}
              loadingResources={loadingResources}
              onClose={() => setDrawerOpen(false)}
            />
          )}
        </div>
      </div>

      {/* BOTTOM DOSSIER PANEL */}
      {selectedSpirit && (
        <div
          style={{
            height: dossierExpanded ? 320 : 48,
            flexShrink: 0,
            transition: 'height 250ms ease',
            background: '#09070F',
            borderTop: '1px solid #2a2035',
            overflow: 'hidden',
            zIndex: 5,
          }}
        >
          <div
            onClick={() => setDossierExpanded(e => !e)}
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 20px',
              cursor: 'pointer',
              borderBottom: dossierExpanded ? '1px solid #1a1520' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: cinzel,
                fontSize: 12,
                color: '#C9A84C',
                letterSpacing: '0.1em',
                flex: 1,
              }}
            >
              {selectedSpirit.name}
            </span>
            {selectedSpirit.kingdom && (
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  color: '#4a3f5a',
                }}
              >
                {selectedSpirit.kingdom}
              </span>
            )}
            <span
              style={{
                fontFamily: cinzel,
                fontSize: 9,
                color: '#4a3f5a',
                letterSpacing: '0.1em',
              }}
            >
              {dossierExpanded ? '▼ CLOSE' : '▲ DOSSIER'}
            </span>
          </div>
          {dossierExpanded && (
            <div
              style={{
                padding: '12px 20px 16px',
                overflowY: 'auto' as const,
                height: 272,
              }}
            >
              {selectedSpirit.description && (
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 13,
                    color: '#c8b99a',
                    lineHeight: 1.7,
                    marginBottom: 14,
                  }}
                >
                  {selectedSpirit.description}
                </div>
              )}
              {companionNames.length > 0 && (
                <div>
                  <div
                    style={{
                      fontFamily: cinzel,
                      fontSize: 8,
                      color: '#C9A84C',
                      letterSpacing: '0.14em',
                      marginBottom: 8,
                    }}
                  >
                    COMPANION SPIRITS
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap' as const,
                      gap: 6,
                    }}
                  >
                    {companionNames.map(name => {
                      const found = demons.find(
                        d => d.name.toLowerCase() === name.toLowerCase()
                      )
                      return (
                        <button
                          key={name}
                          onClick={() => found && selectSpirit(found)}
                          style={{
                            background: 'rgba(201,168,76,0.06)',
                            border: `1px solid ${found ? 'rgba(201,168,76,0.5)' : '#2a2035'}`,
                            borderRadius: 20,
                            padding: '4px 12px',
                            cursor: found ? 'pointer' : 'default',
                            fontFamily: cinzel,
                            fontSize: 9,
                            color: found ? '#C9A84C' : '#4a3f5a',
                          }}
                        >
                          {found ? '⚔ ' : ''}
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
