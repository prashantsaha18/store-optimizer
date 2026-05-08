'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Package, Plus, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = ['Dairy', 'Staples', 'Snacks', 'Household', 'Personal', 'Beverages', 'Bakery', 'Chocolate', 'Other']

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({
    name: '', category: 'Snacks', price: '', cost: '',
    stock_quantity: '', shelf_life_days: '365'
  })

  useEffect(() => { api.getProducts().then(setProducts) }, [])

  async function submit() {
    await api.createProduct({
      name: form.name, category: form.category,
      price: parseFloat(form.price), cost: parseFloat(form.cost),
      stock_quantity: parseInt(form.stock_quantity),
      shelf_life_days: parseInt(form.shelf_life_days)
    })
    setShowForm(false)
    setForm({ name: '', category: 'Snacks', price: '', cost: '', stock_quantity: '', shelf_life_days: '365' })
    api.getProducts().then(setProducts)
  }

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))]
  const filtered = filter === 'All' ? products : products.filter(p => p.category === filter)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
          padding: '28px 16px', position: 'fixed', top: 0, left: 0, height: '100vh'
        }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6c63ff, #ff6584)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>D</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800 }}>DukanAI</span>
            </div>
          </div>
          {[
            { href: '/',         label: 'Dashboard' },
            { href: '/products', label: 'Products' },
            { href: '/sales',    label: 'Record Sale' },
            { href: '/layout',   label: 'Store Layout' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'block', padding: '10px 12px', borderRadius: 8, color: 'var(--text-muted)',
              textDecoration: 'none', fontSize: 14, marginBottom: 2
            }}>
              {item.label}
            </Link>
          ))}
        </aside>

        <main style={{ marginLeft: 220, flex: 1, padding: '32px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Products <span className="grad-text">Inventory</span></h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{products.length} products in your store</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Add Product
            </button>
          </div>

          {/* Add Product Form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(108,99,255,0.3)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>New Product</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { key: 'name',            label: 'Product Name',   type: 'text',   placeholder: 'Maggi Noodles' },
                  { key: 'price',           label: 'Selling Price ₹', type: 'number', placeholder: '14' },
                  { key: 'cost',            label: 'Cost Price ₹',    type: 'number', placeholder: '10' },
                  { key: 'stock_quantity',  label: 'Stock Qty',       type: 'number', placeholder: '100' },
                  { key: 'shelf_life_days', label: 'Shelf Life (days)', type: 'number', placeholder: '180' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{field.label}</label>
                    <input
                      type={field.type} placeholder={field.placeholder}
                      value={(form as any)[field.key]}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      style={{
                        width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13,
                        fontFamily: 'var(--font-display)'
                      }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13 }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button onClick={submit} className="btn-primary">Save Product</button>
                <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: filter === cat ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: filter === cat ? 'rgba(108,99,255,0.15)' : 'transparent',
                  color: filter === cat ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)'
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filtered.map((p, i) => (
              <div key={p.id} className="card fade-up" style={{ animationDelay: `${i * 0.03}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ 
                    fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--bg)',
                    border: '1px solid var(--border)', color: 'var(--text-muted)'
                  }}>
                    {p.category}
                  </div>
                  <div style={{ fontSize: 12, color: '#43e97b', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {p.margin_pct}% margin
                  </div>
                </div>
                
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{p.name}</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Sell Price</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>₹{p.price}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Stock</div>
                    <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.stock_quantity < 10 ? '#ff6584' : 'var(--text)' }}>
                      {p.stock_quantity}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={11} />
                    {p.daily_velocity.toFixed(1)} units/day
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} />
                    {p.shelf_life_days}d shelf
                  </div>
                </div>

                {p.current_zone && (
                  <div style={{ 
                    marginTop: 10, padding: '5px 10px', borderRadius: 6,
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)',
                    fontSize: 11, color: 'var(--accent)'
                  }}>
                    📍 {p.current_zone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
