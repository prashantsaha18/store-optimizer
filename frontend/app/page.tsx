'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'
import { 
  Brain, Package, ShoppingCart, TrendingUp, Zap, 
  ChevronRight, AlertCircle, CheckCircle, Star, ArrowUpRight
} from 'lucide-react'
import Link from 'next/link'

const COLORS = ['#6c63ff', '#ff6584', '#43e97b', '#f6d365', '#64c8ff', '#fb923c']

export default function DashboardPage() {
  const [summary,     setSummary]     = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [catSales,    setCatSales]    = useState<any[]>([])
  const [dailySales,  setDailySales]  = useState<any[]>([])
  const [recs,        setRecs]        = useState<any[]>([])
  const [assocs,      setAssocs]      = useState<any[]>([])
  const [running,     setRunning]     = useState(false)
  const [mlMsg,       setMlMsg]       = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [s, tp, cs, ds, r, a] = await Promise.all([
        api.getSummary(), api.getTopProducts(), api.getCategorySales(),
        api.getDailySales(), api.getRecommendations(), api.getAssociations()
      ])
      setSummary(s); setTopProducts(tp); setCatSales(cs)
      setDailySales(ds.reverse()); setRecs(r); setAssocs(a)
    } catch (e) { console.error(e) }
  }

  async function runML() {
    setRunning(true); setMlMsg('Running ML analysis...')
    try {
      const res = await api.runML()
      setMlMsg(`✓ Analysis complete! ${res.recommendations_generated} recommendations generated, ${res.association_rules_found} association rules found.`)
      await loadAll()
    } catch (e) {
      setMlMsg('Error running ML. Check backend is running.')
    }
    setRunning(false)
  }

  async function applyRec(id: string) {
    await api.applyRecommendation(id)
    await loadAll()
  }

  const pendingRecs = recs.filter(r => !r.is_applied)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{
          width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
          padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4,
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10
        }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6c63ff, #ff6584)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Brain size={18} color="white" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800 }}>DukanAI</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Smart Store Optimizer
            </span>
          </div>

          {[
            { href: '/',          icon: <TrendingUp size={16} />,  label: 'Dashboard' },
            { href: '/products',  icon: <Package size={16} />,     label: 'Products' },
            { href: '/sales',     icon: <ShoppingCart size={16} />, label: 'Record Sale' },
            { href: '/layout',    icon: <Star size={16} />,        label: 'Store Layout' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, color: 'var(--text-muted)',
              textDecoration: 'none', fontSize: 14, fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { 
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={e => { 
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            }}>
              {item.icon}{item.label}
            </Link>
          ))}

          <div style={{ marginTop: 'auto' }}>
            <button onClick={runML} disabled={running} className="btn-primary pulse-glow"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Zap size={15} />
              {running ? 'Running...' : 'Run ML Analysis'}
            </button>
            {mlMsg && (
              <div style={{ 
                marginTop: 8, fontSize: 11, color: mlMsg.startsWith('✓') ? 'var(--accent-3)' : 'var(--accent-2)',
                lineHeight: 1.5, padding: 8, background: 'var(--bg)', borderRadius: 6
              }}>
                {mlMsg}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────────── */}
        <main style={{ marginLeft: 220, flex: 1, padding: '32px 28px', maxWidth: 'calc(100vw - 220px)' }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
              Store <span className="grad-text">Command Center</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              ML-powered insights to maximize your store's sales potential
            </p>
          </div>

          {/* Stats Row */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Products',    value: summary.total_products,         icon: <Package size={18} />,     color: '#6c63ff' },
                { label: 'Transactions',      value: summary.total_transactions,     icon: <ShoppingCart size={18} />, color: '#43e97b' },
                { label: 'Total Revenue',     value: `₹${summary.total_revenue?.toLocaleString()}`, icon: <TrendingUp size={18} />, color: '#f6d365' },
                { label: 'ML Recommendations',value: summary.pending_recommendations, icon: <Brain size={18} />,       color: '#ff6584' },
              ].map((stat, i) => (
                <div key={i} className="card fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{stat.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
                    </div>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: stat.color,
                      background: `${stat.color}18`
                    }}>
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            {/* Revenue Trend */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-muted)' }}>
                DAILY REVENUE TREND
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                    formatter={(v: any) => [`₹${v}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#6c63ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-muted)' }}>
                SALES BY CATEGORY
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={catSales} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                    {catSales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                    formatter={(v: any) => [`₹${v}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {catSales.map((c, i) => (
                  <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{c.category}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ML Recommendations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Placement Recs */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                  <Brain size={15} style={{ display: 'inline', marginRight: 6, color: 'var(--accent)' }} />
                  PLACEMENT RECOMMENDATIONS
                </h3>
                <Link href="/layout" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                  View all <ArrowUpRight size={12} style={{ display: 'inline' }} />
                </Link>
              </div>

              {pendingRecs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  No recommendations yet. Run ML Analysis!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingRecs.slice(0, 5).map((rec, i) => (
                    <div key={rec.id} style={{
                      padding: '12px 14px', background: 'var(--bg)',
                      borderRadius: 8, border: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', gap: 6
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{rec.product.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            → <span style={{ color: 'var(--accent)' }}>{rec.zone.name}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ 
                            fontSize: 13, fontWeight: 700, color: '#43e97b',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {rec.score.toFixed(0)}
                          </div>
                          <button onClick={() => applyRec(rec.id)}
                            style={{ 
                              background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)',
                              color: 'var(--accent)', borderRadius: 6, padding: '4px 10px',
                              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-display)'
                            }}>
                            Apply
                          </button>
                        </div>
                      </div>
                      <div className="score-bar">
                        <div className="score-fill" style={{ width: `${rec.score}%` }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{rec.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Association Rules */}
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                <Zap size={15} style={{ display: 'inline', marginRight: 6, color: '#f6d365' }} />
                BOUGHT TOGETHER (Market Basket)
              </h3>

              {assocs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  No associations yet. Add sales and run ML!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {assocs.slice(0, 6).map((a, i) => (
                    <div key={a.id} style={{
                      padding: '10px 12px', background: 'var(--bg)',
                      borderRadius: 8, border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>
                          {a.product_a.name}
                          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>+</span>
                          {a.product_b.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                          lift: {a.lift.toFixed(2)} · conf: {(a.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                        ...(a.strength === 'STRONG' ? {} : {})
                      }} className={`badge-${a.strength.toLowerCase()}`}>
                        {a.strength}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Products Bar Chart */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-muted)' }}>
              TOP SELLING PRODUCTS
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical">
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
                <Bar dataKey="total_qty" fill="#6c63ff" radius={[0, 4, 4, 0]} name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </main>
      </div>
    </div>
  )
}
