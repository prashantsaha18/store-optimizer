# 🏪 DukanAI — Smart Store Optimizer

ML-powered retail placement optimizer. Uses **Market Basket Analysis (FP-Growth)** to find which products are bought together, and a **multi-factor scoring model** to recommend the best zone for each product.

---

## 🧠 How the ML Works

### 1. Market Basket Analysis (FP-Growth)
- Every time you record a sale with multiple items, the system learns
- It finds patterns: "Customers who buy Maggi also buy Ketchup 73% of the time"
- These are stored as association rules with **Support**, **Confidence**, and **Lift** scores
- **High Lift (>2)** = strongly recommend placing these items near each other

### 2. Placement Optimizer (Scoring Model)
Each product is scored 0–100 for each zone based on:

| Factor | Weight | Logic |
|--------|--------|-------|
| Sales Velocity | 40% | Fast-selling items → high visibility zones |
| Profit Margin | 25% | High-margin items → eye-level prime spots |
| Basket Affinity | 20% | Place near items frequently bought together |
| Shelf Life | 10% | Perishables → visible zones (sell before expire) |
| Category Fit | 5% | e.g. Checkout → Chocolates, Cold Zone → Dairy |

---

## 🚀 Deployment Guide

### Step 1: Setup Database (Neon)

1. Go to [neon.tech](https://neon.tech), login
2. Open **SQL Editor**
3. Paste and run the entire `schema.sql` file
4. Copy your connection string

### Step 2: Deploy Backend (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# In the backend folder
cd backend

# Copy and fill env
cp .env.example .env
# Edit .env: paste your Neon DATABASE_URL

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# DATABASE_URL = your Neon connection string
# FRONTEND_URL = https://your-app.vercel.app (fill after step 3)
```

Your backend will be at: `https://your-project.railway.app`

### Step 3: Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# In the frontend folder
cd frontend
npm install

# Deploy
vercel

# In Vercel Dashboard → Project → Settings → Environment Variables:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app
```

Your frontend will be at: `https://your-project.vercel.app`

### Step 4: Update CORS

In Railway, add environment variable:
```
FRONTEND_URL=https://your-project.vercel.app
```

---

## 💻 Local Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with your DATABASE_URL

uvicorn main:app --reload --port 8000
```
API docs at: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```
App at: http://localhost:3000

---

## 📱 How to Use

1. **Add Products** → Go to Products page, add all your items with price, cost, shelf life
2. **Record Sales** → Every sale you make, enter it on the Sales page (this trains the ML)
3. **Run ML Analysis** → Click "Run ML Analysis" button (sidebar)
4. **View Recommendations** → Dashboard shows what to move where and why
5. **Apply Placements** → Click "Apply" to record the new placement
6. **Repeat** → More sales data = better recommendations

---

## 🗂 Project Structure

```
store-optimizer/
├── schema.sql              ← Run in Neon SQL Editor first
├── backend/                ← Python FastAPI (deploy on Railway)
│   ├── main.py
│   ├── database.py         ← SQLAlchemy models + Neon connection
│   ├── requirements.txt
│   ├── railway.toml        ← Railway deployment config
│   ├── ml/
│   │   ├── basket_analysis.py      ← FP-Growth market basket analysis
│   │   └── placement_optimizer.py  ← Multi-factor placement scoring
│   └── routers/
│       ├── products.py
│       ├── transactions.py   ← Recording sales (ML training data)
│       ├── zones.py
│       ├── recommendations.py ← Main ML endpoint: /api/recommendations/run
│       └── analytics.py
└── frontend/               ← Next.js (deploy on Vercel)
    ├── app/
    │   ├── page.tsx          ← Dashboard: charts, stats, ML recs
    │   ├── products/         ← Product inventory management
    │   ├── sales/            ← Record daily sales
    │   └── layout/           ← Store floor plan + placement map
    └── lib/api.ts            ← API client
```

---

## 🔑 Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/recommendations/run` | POST | **Trigger full ML pipeline** |
| `/api/recommendations/` | GET | Get latest recommendations |
| `/api/recommendations/associations` | GET | Bought-together rules |
| `/api/recommendations/{id}/apply` | POST | Apply a recommendation |
| `/api/transactions/` | POST | Record a sale |
| `/api/analytics/summary` | GET | Dashboard stats |

---

## 📊 ML Parameters (Customize in `routers/recommendations.py`)

```python
rules = run_basket_analysis(
    transactions_list,
    min_support=0.01,    # item set must appear in 1% of transactions
    min_confidence=0.15, # A→B must be true 15% of time A appears
    min_lift=1.0         # must be better than random chance
)
```

Lower `min_support` to find more patterns (needs more data).
