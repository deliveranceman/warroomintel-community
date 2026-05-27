import { useState, useEffect, useRef } from 'react'

const G = '#C9A84C'
const BG = '#0D0B14'
const SURF = '#12101e'
const SURF2 = '#1a1726'
const BDR = 'rgba(201,168,76,0.22)'
const TXT = '#e8dcc8'
const DIM = '#a09080'
const MUT = '#6b5e45'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_COLORS: Record<number, string> = {
  4: '#e05050',
  3: '#e07a30',
  2: '#d4b84a',
  1: '#6bc06b',
}

interface Spirit {
  spirit_name: string
  tier_level: number
  confidence: string
  legal_rights?: string
  regional_notes?: string
  identified_by?: string
}

interface Region {
  id: string
  name: string
  anchor_lat: number
  anchor_lng: number
  radius_miles: number
  tier: string
  redemptive_gift?: string
  spirits?: Spirit[]
  ai_research_cache?: Record<string, string>
}

interface Props {
  userTier: string
}

const TIER_LEVELS: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3,
}

// Copper Basin pre-populated spirits
const COPPER_BASIN_SPIRITS: Spirit[] = [
  { spirit_name: 'Leviathan', tier_level: 4, confidence: 'CONFIRMED', legal_rights: 'pride and isolation patterns in regional culture', regional_notes: 'Dominant territorial spirit over Copper Basin' },
  { spirit_name: 'Jezebel', tier_level: 4, confidence: 'CONFIRMED', legal_rights: 'witchcraft and folk magic in ancestral bloodlines', regional_notes: 'Strong witchcraft influence from Cherokee and mining era practices' },
  { spirit_name: 'Spirit of Poverty', tier_level: 3, confidence: 'CONFIRMED', legal_rights: 'economic devastation from copper mining collapse', regional_notes: 'Post-industrial economic despair deeply embedded' },
  { spirit_name: 'Religious Spirit', tier_level: 3, confidence: 'CONFIRMED', legal_rights: 'denominational divisions and church splits', regional_notes: 'Multiple church splits in region history' },
  { spirit_name: 'Spirit of Addiction', tier_level: 3, confidence: 'CONFIRMED', legal_rights: 'opioid crisis and generational alcoholism', regional_notes: 'One of highest addiction rates in TN/GA' },
  { spirit_name: 'Masonic Spirit', tier_level: 3, confidence: 'CONFIRMED', legal_rights: 'Ducktown Lodge #241, Copperhill Lodge #656', regional_notes: 'Two Masonic lodges with long regional history' },
  { spirit_name: 'Spirit of Division', tier_level: 2, confidence: 'CONFIRMED', legal_rights: 'TN/GA state line through region heart', regional_notes: 'Geographic and political division rooted in history' },
  { spirit_name: 'Hopelessness', tier_level: 2, confidence: 'CONFIRMED', legal_rights: 'economic collapse and population decline', regional_notes: 'Generational poverty and youth exodus' },
  { spirit_name: 'Drug Economy', tier_level: 2, confidence: 'CONFIRMED', legal_rights: 'vacuum left by industrial decline', regional_notes: 'Drug trade fills economic void' },
  { spirit_name: 'Marine Kingdom', tier_level: 2, confidence: 'INVESTIGATING', legal_rights: 'Ocoee River and multiple water bodies', regional_notes: 'Under investigation — strong water influence' },
  { spirit_name: 'Familiar Spirits', tier_level: 1, confidence: 'CONFIRMED', legal_rights: 'ancestral Cherokee shamanism', regional_notes: 'Generational familiar spirits in bloodlines' },
]

declare global {
  interface Window {
    L: any
    leafletLoaded?: boolean
  }
}

function loadLeaflet(): Promise<void> {
  if (window.leafletLoaded) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { window.leafletLoaded = true; resolve() }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export function IntelligenceMap({ userTier }: Props) {
  const userLevel = TIER_LEVELS[userTier?.toLowerCase()] ?? 0
  const hasAccess = userLevel >= 1
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [activePanel, setActivePanel] = useState<'principalities' | 'findings' | 'prayer'>('principalities')
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  // Load regions from Supabase
  useEffect(() => {
    fetch('/api/sm-regions')
      .then(r => r.json())
      .then(d => setRegions(d.regions || []))
      .catch(() => {
        // Fallback to hardcoded Copper Basin
        setRegions([{
          id: 'copper-basin',
          name: 'Copper Basin',
          anchor_lat: 35.0162,
          anchor_lng: -84.3754,
          radius_miles: 40,
          tier: 'regional',
          redemptive_gift: 'Craftsmanship',
          spirits: COPPER_BASIN_SPIRITS,
        }])
      })
  }, [])

  // Initialize Leaflet map
  useEffect(() => {
    if (!hasAccess || !mapRef.current || mapInstance.current) return
    loadLeaflet().then(() => {
      if (!mapRef.current || mapInstance.current) return
      const L = window.L
      const map = L.map(mapRef.current, {
        center: [35.5, -83.5],
        zoom: 7,
        zoomControl: true,
      })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)
      mapInstance.current = map
      setMapReady(true)
    }).catch(console.error)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [hasAccess])

  // Add markers when regions load and map is ready
  useEffect(() => {
    if (!mapReady || !mapInstance.current || regions.length === 0) return
    const L = window.L
    const map = mapInstance.current

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer)
      }
    })

    regions.forEach(region => {
      if (!region.anchor_lat || !region.anchor_lng) return

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:${G};border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(201,168,76,0.8);cursor:pointer"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      L.marker([region.anchor_lat, region.anchor_lng], { icon })
        .addTo(map)
        .on('click', () => {
          const withSpirits = { ...region, spirits: region.spirits || COPPER_BASIN_SPIRITS }
          setSelectedRegion(withSpirits)
          setActivePanel('principalities')
        })

      // Radius circle
      L.circle([region.anchor_lat, region.anchor_lng], {
        radius: (region.radius_miles || 40) * 1609.34,
        color: G,
        fillColor: G,
        fillOpacity: 0.04,
        weight: 1,
        dashArray: '4,6',
      }).addTo(map)
    })
  }, [mapReady, regions])

  const spirits = selectedRegion?.spirits || []
  const tier4 = spirits.filter(s => s.tier_level === 4)
  const tier3 = spirits.filter(s => s.tier_level === 3)
  const tier2 = spirits.filter(s => s.tier_level === 2)
  const tier1 = spirits.filter(s => s.tier_level === 1)

  if (!hasAccess) {
    return (
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: BG }}>
        {/* Blurred preview */}
        <div style={{ filter: 'blur(8px)', height: '100%', background: 'linear-gradient(180deg, #0a0a1a 0%, #111428 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Decorative pins */}
          {[[35, -84], [36, -82], [34, -85], [33.5, -83]].map(([lat, lng], i) => (
            <div key={i} style={{ position: 'absolute', left: `${20 + i * 20}%`, top: `${20 + (i % 2) * 30}%`, width: 16, height: 16, background: G, borderRadius: '50%', boxShadow: `0 0 12px ${G}` }} />
          ))}
        </div>
        {/* Upgrade overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,11,20,0.75)', backdropFilter: 'blur(2px)' }}>
          <div style={{ fontFamily: cinzel, fontSize: 22, color: G, marginBottom: 8 }}>🌍 Intelligence Map</div>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: DIM, marginBottom: 4 }}>
            {regions.length > 0 ? `${regions.length} regions mapped` : 'Loading regions...'}
          </div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', maxWidth: 340, textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
            The Global Intelligence Map is available to Soldier members and above. Upgrade to view principalities, findings, and intercession targets for each mapped region.
          </div>
          <a href="/membership" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.14em', color: BG, background: G, padding: '12px 28px', borderRadius: 4, textDecoration: 'none' }}>
            UPGRADE TO SOLDIER+
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: BG }}>
      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.2em', color: MUT }}>LOADING MAP...</div>
          </div>
        )}
      </div>

      {/* Region panel */}
      {selectedRegion && (
        <div style={{ width: 340, background: SURF, borderLeft: `1px solid ${BDR}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {/* Panel header */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 14, color: G, fontWeight: 600 }}>{selectedRegion.name}</div>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, marginTop: 3 }}>
                {selectedRegion.tier?.toUpperCase()} — {selectedRegion.radius_miles}mi radius
              </div>
            </div>
            <button onClick={() => setSelectedRegion(null)} style={{ background: 'none', border: 'none', color: MUT, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${BDR}` }}>
            {(['principalities', 'findings', 'prayer'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                style={{
                  flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                  borderBottom: `2px solid ${activePanel === tab ? G : 'transparent'}`,
                  fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em',
                  color: activePanel === tab ? G : MUT, cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {activePanel === 'principalities' && (
              <div>
                {[4, 3, 2, 1].map(tier => {
                  const tierSpirits = spirits.filter(s => s.tier_level === tier)
                  if (tierSpirits.length === 0) return null
                  return (
                    <div key={tier} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: TIER_COLORS[tier], flexShrink: 0 }} />
                        <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: TIER_COLORS[tier] }}>
                          TIER {tier} {tier === 4 ? '— RULING PRINCIPALITIES' : tier === 3 ? '— STRONG MEN' : tier === 2 ? '— POWERS' : '— FAMILIAR SPIRITS'}
                        </div>
                      </div>
                      {tierSpirits.map((s, i) => (
                        <div key={i} style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT }}>{s.spirit_name}</div>
                            <span style={{
                              fontFamily: cinzel, fontSize: 7, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 3,
                              background: s.confidence === 'CONFIRMED' ? 'rgba(80,180,80,0.15)' : s.confidence === 'INVESTIGATING' ? 'rgba(212,184,74,0.15)' : 'rgba(120,120,120,0.15)',
                              color: s.confidence === 'CONFIRMED' ? '#80e090' : s.confidence === 'INVESTIGATING' ? '#d4b84a' : '#909090',
                              border: `1px solid ${s.confidence === 'CONFIRMED' ? 'rgba(80,180,80,0.3)' : s.confidence === 'INVESTIGATING' ? 'rgba(212,184,74,0.3)' : 'rgba(120,120,120,0.3)'}`,
                            }}>
                              {s.confidence}
                            </span>
                          </div>
                          {s.legal_rights && <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>{s.legal_rights}</div>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {activePanel === 'findings' && (
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT, marginBottom: 12 }}>FIELD INTELLIGENCE</div>
                {spirits.map((s, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${BDR}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: TIER_COLORS[s.tier_level], flexShrink: 0 }} />
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: TXT }}>{s.spirit_name}</div>
                    </div>
                    {s.regional_notes && <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, paddingLeft: 16, lineHeight: 1.5 }}>{s.regional_notes}</div>}
                  </div>
                ))}
              </div>
            )}

            {activePanel === 'prayer' && (
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT, marginBottom: 12 }}>INTERCESSION TARGETS</div>
                {selectedRegion.redemptive_gift && (
                  <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: G, marginBottom: 4 }}>REDEMPTIVE GIFT</div>
                    <div style={{ fontFamily: cinzel, fontSize: 13, color: TXT }}>{selectedRegion.redemptive_gift}</div>
                  </div>
                )}
                <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: MUT, marginBottom: 8 }}>INTERCESSION TARGETS</div>
                {[4, 3, 2, 1].map(tier => {
                  const ts = spirits.filter(s => s.tier_level === tier)
                  if (!ts.length) return null
                  return ts.map((s, i) => (
                    <div key={`${tier}-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: TIER_COLORS[tier], flexShrink: 0, marginTop: 4 }} />
                      <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.5 }}>
                        <strong style={{ color: TXT }}>{s.spirit_name}:</strong> {s.legal_rights}
                      </div>
                    </div>
                  ))
                })}
                <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(201,168,76,0.06)', borderRadius: 6, border: `1px solid ${BDR}` }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: G, marginBottom: 6 }}>DECLARATION</div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.6, fontStyle: 'italic' }}>
                    "The earth is the LORD's and the fullness thereof. We declare {selectedRegion.name} belongs to Jesus Christ, and we bind every territorial spirit operating over this region in the name of Jesus."
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
