const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export const api = {
  // Products
  getProducts:    ()  => req('/api/products/'),
  createProduct:  (d: any) => req('/api/products/', { method: 'POST', body: JSON.stringify(d) }),
  getCategories:  ()  => req('/api/products/categories'),

  // Transactions
  createTransaction: (d: any) => req('/api/transactions/', { method: 'POST', body: JSON.stringify(d) }),
  getRecentTxns:     () => req('/api/transactions/recent'),

  // Zones
  getZones: () => req('/api/zones/'),

  // ML Recommendations
  runML:             () => req('/api/recommendations/run', { method: 'POST' }),
  getRecommendations: () => req('/api/recommendations/'),
  getAssociations:   () => req('/api/recommendations/associations'),
  applyRecommendation: (id: string) => req(`/api/recommendations/${id}/apply`, { method: 'POST' }),

  // Analytics
  getSummary:       () => req('/api/analytics/summary'),
  getTopProducts:   () => req('/api/analytics/top-products'),
  getCategorySales: () => req('/api/analytics/sales-by-category'),
  getDailySales:    () => req('/api/analytics/daily-sales'),
}
