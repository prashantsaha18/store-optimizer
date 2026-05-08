'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Brain, CheckCircle, Star, Layers } from 'lucide-react'
import Link from 'next/link'

const ZONE_COLORS: Record<string, string> = {
  high_traffic: '#6c63ff',
  eye_level:    '#43e97b',
  checkout:     '#ff6584',
  cold:         '#64c8ff',
  bulk:         '#f6d365',
}

const ZONE_LABELS: Record<string, string> = {
  high_traffic: '🚶 High Traffic',
  eye_level:    '👁 Eye Level',
  checkout:     '💳 Checkout',
  cold:         '❄️ Cold',
  bulk:         '📦 Bulk',
}

export default function LayoutPage() {
  const [zones,   setZones]   = useState<any[]>([])
  const [recs,    setRecs]    = useState<any[]>([])
  const [assocs,  setAssocs]  = useState<any[]>([])
  const [running, setRunning] = useState(false)
  const [msg,     setMsg]     = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [z, r, a] = await Promise.all([api.getZones(), api.getRecommendations(), api.getAssociations()])
    setZones(z); setRecs(r); setAssocs(a)
  }

  async function runML() {
    setRunning(true); setMsg('Analyzing your store data...')
    try {
      const res = await api.runML()
      setMsg(`✓ ${res.recommendations_generated} placements computed, ${res.association_rules_found} buying patterns found!`)
      await loadAll()
    } catch { setMsg('Error — is the backend running?') }
    setRunning(false)
  }

  async function applyRec(id: string) {
    await api.applyRecommendation(id)
    await loadAll()
  }

  // Build grid from zones
  const maxX = Math.max(...zones.map(z => z.x), 3)
  const maxY = Math.max(...zones.map(z => z.y), 3)

  const pendingRecs = recs.filter(r => !r.is_applied)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{ width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', padding: '28px 16px', position: 'fixed', top: 0, left: 0, height: '100vh' }}>
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>DukanAI</span>
          </div>
          {[
            { href: '/',         label: 'Dashboard' },
            { href: '/products', label: 'Products' },
            { href: '/sales',    label: 'Record Sale' },
            { href: '/layout',   label: 'Store Layout' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ display: 'block', padding: '10px 12px', borderRadius: 8, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14, marginBottom: 2 }}>
              {item.label}
            </Link>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <button onClick={runML} disabled={running} className="btn-primary pulse-glow" style={{ width: '100%' }}>
              <Brain size={14} style={{ display: 'inline', marginRight: 6 }} />
              {running ? 'Analyzing...' : 'Run ML'}
            </button>
            {msg && <div style={{ marginTop: 8, fontSize: 11, color: msg.startsWith('✓') ? '#43e97b' : '#ff6584', lineHeight: 1.5 }}>{msg}</div>}
          </div>
        </aside>

        <main style={{ marginLeft: 220, flex: 1, padding: '32px 28px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Store <span className="grad-text">Layout</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Visual map of your zones + AI placement suggestions</p>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {Object.entries(ZONE_LABELS).map(([type, label]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: ZONE_COLORS[type] + '50', border: `2px solid ${ZONE_COLORS[type]}` }} />
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            {/* Store Grid */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={14} style={{ color: 'var(--accent)' }} />
                STORE FLOOR PLAN
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${maxX + 1}, 1fr)`,
                gridTemplateRows: `repeat(${maxY + 1}, 1fr)`,
                gap: 8, minHeight: 400
              }}>
                {zones.map(zone => {
                  const color = ZONE_COLORS[zone.type] || '#6b6b8a'
                  const zoneRecs = recs.filter(r => r.zone.id === zone.id && !r.is_applied)
                  return (
                    <div key={zone.id} style={{
                      gridColumn: `${zone.x + 1}`,
                      gridRow: `${zone.y + 1}`,
                      padding: 12, borderRadius: 10, minHeight: 100,
                      background: `${color}10`,
                      border: `2px solid ${color}50`,
                      transition: 'border-color 0.2s'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {zone.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                        👁 {zone.visibility_score}/10 · {zone.product_count}/{zone.capacity} items
                      </div>
                      
                      {/* Current products */}
                      {zone.products?.map((p: any) => (
                        <div key={p.id} style={{ fontSize: 10, padding: '3px 7px', background: `${color}20`, borderRadius: 4, marginBottom: 3, color }}>
                          {p.name}
                        </div>
                      ))}

                      {/* ML rec badges */}
                      {zoneRecs.length > 0 && (
                        <div style={{ marginTop: 6, borderTop: `1px solid ${color}30`, paddingTop: 6 }}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>ML suggests:</div>
                          {zoneRecs.slice(0, 2).map(r => (
                            <div key={r.id} style={{ 
                              fontSize: 10, padding: '2px 6px', background: 'rgba(108,99,255,0.15)',
                              border: '1px solid rgba(108,99,255,0.3)', borderRadius: 4, marginBottom: 2,
                              color: 'var(--accent)', display: 'flex', justifyContent: 'space-between'
                            }}>
                              <span>✨ {r.product.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{r.score.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Entry indicator */}
              <div style={{ marginTop: 12, textAlign: 'center', padding: '8px', background: 'rgba(67,233,123,0.1)', borderRadius: 6, border: '1px dashed rgba(67,233,123,0.3)', fontSize: 12, color: '#43e97b' }}>
                🚪 Main Entrance / Customer Entry →
              </div>
            </div>

            {/* Recommendations Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Pending Recs */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Brain size={14} style={{ color: 'var(--accent)' }} /> 
                  PLACEMENT QUEUE ({pendingRecs.length})
                </h3>
                {pendingRecs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                    Run ML Analysis to get recommendations
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {pendingRecs.map(rec => (
                      <div key={rec.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{rec.product.name}</div>
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#43e97b', fontWeight: 700 }}>
                            {rec.score.toFixed(0)}pts
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                          → <span style={{ color: 'var(--accent)' }}>{rec.zone.name}</span> ({rec.zone.type})
                        </div>
                        <div className="score-bar" style={{ marginBottom: 8 }}>
                          <div className="score-fill" style={{ width: `${rec.score}%` }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>{rec.reason}</div>
                        <button onClick={() => applyRec(rec.id)}
                          style={{
                            width: '100%', background: 'rgba(67,233,123,0.1)', border: '1px solid rgba(67,233,123,0.3)',
                            color: '#43e97b', borderRadius: 6, padding: '5px 0', fontSize: 11,
                            cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600
                          }}>
                          ✓ Apply Placement
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Association rules */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                  🔗 PLACE THESE TOGETHER
                </h3>
                {assocs.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No associations yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflowY: 'auto' }}>
                    {assocs.filter(a => a.strength !== 'WEAK').map(a => (
                      <div key={a.id} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                          {a.product_a.name} <span style={{ color: '#f6d365' }}>↔</span> {a.product_b.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            lift {a.lift.toFixed(2)}
                          </div>
                          <span className={`badge-${a.strength.toLowerCase()}`} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10 }}>
                            {a.strength}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
