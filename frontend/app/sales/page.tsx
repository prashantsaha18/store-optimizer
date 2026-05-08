'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { ShoppingCart, Plus, Trash2, Check } from 'lucide-react'
import Link from 'next/link'

export default function SalesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [selectedPid, setSelectedPid] = useState('')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    api.getProducts().then(setProducts)
    api.getRecentTxns().then(setRecent)
  }, [])

  function addToCart() {
    if (!selectedPid) return
    const prod = products.find(p => p.id === selectedPid)
    if (!prod) return
    const existing = cart.find(c => c.product_id === selectedPid)
    if (existing) {
      setCart(cart.map(c => c.product_id === selectedPid ? { ...c, quantity: c.quantity + qty } : c))
    } else {
      setCart([...cart, { product_id: prod.id, name: prod.name, unit_price: prod.price, quantity: qty, category: prod.category }])
    }
    setSelectedPid('')
    setQty(1)
  }

  function removeFromCart(pid: string) {
    setCart(cart.filter(c => c.product_id !== pid))
  }

  async function submitSale() {
    if (cart.length === 0) return
    await api.createTransaction({
      items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price })),
      notes
    })
    setCart([])
    setNotes('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    api.getRecentTxns().then(setRecent)
  }

  const total = cart.reduce((sum, c) => sum + c.quantity * c.unit_price, 0)

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
        </aside>

        <main style={{ marginLeft: 220, flex: 1, padding: '32px 28px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Record <span className="grad-text">Sale</span></h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Enter items sold — ML will learn from this data</p>

          {success && (
            <div style={{ 
              marginBottom: 20, padding: '14px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(67, 233, 123, 0.1)', border: '1px solid rgba(67, 233, 123, 0.3)', color: '#43e97b'
            }}>
              <Check size={18} /> Sale recorded! ML model will improve with this data.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
            {/* Add Items */}
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Add Items</h3>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Product</label>
                    <select value={selectedPid} onChange={e => setSelectedPid(e.target.value)}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13 }}>
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: 90 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Qty</label>
                    <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value))}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13 }} />
                  </div>
                  <button onClick={addToCart} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <Plus size={15} /> Add
                  </button>
                </div>
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingCart size={15} style={{ color: 'var(--accent)' }} />
                    Cart ({cart.length} items)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cart.map(item => (
                      <div key={item.product_id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', background: 'var(--bg)', borderRadius: 8
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.quantity} × ₹{item.unit_price}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#43e97b' }}>
                            ₹{(item.quantity * item.unit_price).toFixed(2)}
                          </div>
                          <button onClick={() => removeFromCart(item.product_id)}
                            style={{ background: 'none', border: 'none', color: '#ff6584', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ 
                    marginTop: 16, padding: '12px 14px', background: 'rgba(108,99,255,0.1)',
                    borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid rgba(108,99,255,0.2)'
                  }}>
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
                      ₹{total.toFixed(2)}
                    </span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Repeat customer"
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13 }} />
                  </div>
                  <button onClick={submitSale} className="btn-primary" style={{ width: '100%', marginTop: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={15} /> Record Sale
                  </button>
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="card" style={{ height: 'fit-content' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Sales</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recent.slice(0, 10).map(txn => (
                  <div key={txn.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: '#43e97b' }}>
                        ₹{txn.total.toFixed(0)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{txn.item_count} items</div>
                  </div>
                ))}
                {recent.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    No sales yet. Record your first sale!
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
