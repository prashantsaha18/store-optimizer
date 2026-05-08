-- ===================================================
-- STORE OPTIMIZER - Neon PostgreSQL Schema
-- Run this in your Neon SQL Editor
-- ===================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  shelf_life_days INTEGER DEFAULT 365,
  weight_kg DECIMAL(8, 3) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Store zones table (physical areas of store)
CREATE TABLE IF NOT EXISTS store_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,        -- e.g. "Entry Zone", "Eye Level", "Checkout"
  zone_type VARCHAR(50) NOT NULL,    -- 'high_traffic', 'eye_level', 'checkout', 'cold', 'bulk'
  visibility_score INTEGER DEFAULT 5, -- 1-10, how visible customers find this
  position_x INTEGER NOT NULL,       -- Grid X position
  position_y INTEGER NOT NULL,       -- Grid Y position
  capacity INTEGER DEFAULT 10,       -- How many product types fit here
  description TEXT
);

-- Product placements (what's placed where)
CREATE TABLE IF NOT EXISTS product_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES store_zones(id) ON DELETE CASCADE,
  placed_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT TRUE,
  UNIQUE(zone_id, product_id)
);

-- Sales transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date TIMESTAMP DEFAULT NOW(),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  customer_id VARCHAR(100),  -- optional anonymous customer tracking
  notes TEXT
);

-- Transaction line items
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ML-generated placement recommendations
CREATE TABLE IF NOT EXISTS placement_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  recommended_zone_id UUID REFERENCES store_zones(id) ON DELETE CASCADE,
  placement_score DECIMAL(5, 2) NOT NULL,  -- 0-100
  reason TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  is_applied BOOLEAN DEFAULT FALSE
);

-- Product associations (items frequently bought together)
CREATE TABLE IF NOT EXISTS product_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_a UUID REFERENCES products(id) ON DELETE CASCADE,
  product_b UUID REFERENCES products(id) ON DELETE CASCADE,
  support DECIMAL(8, 4),      -- % of transactions containing both
  confidence DECIMAL(8, 4),   -- P(B|A)
  lift DECIMAL(8, 4),         -- confidence / P(B)
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_a, product_b)
);

-- ===================================================
-- INDEXES for performance
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_txn ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_placements_zone ON product_placements(zone_id);
CREATE INDEX IF NOT EXISTS idx_associations_product ON product_associations(product_a);

-- ===================================================
-- SAMPLE DATA - Kirana Store Example
-- ===================================================

-- Insert sample zones
INSERT INTO store_zones (name, zone_type, visibility_score, position_x, position_y, capacity, description) VALUES
  ('Entry Zone',      'high_traffic', 9, 0, 0, 8,  'First thing customer sees'),
  ('Eye Level Left',  'eye_level',    8, 1, 1, 12, 'Prime shelf space, left side'),
  ('Eye Level Right', 'eye_level',    8, 2, 1, 12, 'Prime shelf space, right side'),
  ('Center Aisle',    'high_traffic', 7, 1, 2, 15, 'Main shopping aisle'),
  ('Checkout Counter','checkout',     10, 3, 0, 5,  'Impulse buy zone near billing'),
  ('Back Wall',       'bulk',         4, 0, 3, 20, 'Staples and heavy items'),
  ('Cold Section',    'cold',         6, 3, 2, 8,  'Refrigerated products'),
  ('Top Shelf',       'eye_level',    3, 1, 0, 10, 'Less visible, harder to reach'),
  ('Bottom Shelf',    'bulk',         2, 2, 3, 10, 'Bulk/heavy items at bottom')
ON CONFLICT DO NOTHING;

-- Insert sample products (Kirana store items)
INSERT INTO products (name, category, price, cost, stock_quantity, shelf_life_days) VALUES
  ('Amul Butter 500g',        'Dairy',      55.00,  42.00, 50,  30),
  ('Tata Salt 1kg',           'Staples',    20.00,  16.00, 200, 365),
  ('Maggi Noodles 70g',       'Snacks',     14.00,  10.50, 150, 180),
  ('Parle-G Biscuits 800g',   'Snacks',     50.00,  38.00, 100, 180),
  ('Aashirvaad Atta 5kg',     'Staples',    250.00, 210.00, 80, 365),
  ('Surf Excel 1kg',          'Household',  195.00, 160.00, 60, 730),
  ('Colgate Toothpaste 150g', 'Personal',   65.00,  50.00, 80, 730),
  ('Fortune Sunflower Oil 1L','Staples',    135.00, 118.00, 100, 365),
  ('Coca Cola 600ml',         'Beverages',  40.00,  32.00, 120, 180),
  ('Lays Classic 26g',        'Snacks',     20.00,  15.00, 200, 90),
  ('Dettol Soap 75g',         'Personal',   40.00,  30.00, 100, 730),
  ('Britannia Bread',         'Bakery',     40.00,  30.00, 60,  5),
  ('Dairy Milk 40g',          'Chocolate',  20.00,  14.00, 200, 180),
  ('Lipton Tea 250g',         'Beverages',  130.00, 100.00, 90, 730),
  ('Kurkure 26g',             'Snacks',     20.00,  15.00, 180, 90)
ON CONFLICT DO NOTHING;

-- ===================================================
-- VIEWS for analytics
-- ===================================================

-- Product sales velocity view
CREATE OR REPLACE VIEW product_sales_velocity AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.price,
  COALESCE(SUM(ti.quantity), 0) as total_sold,
  COALESCE(COUNT(DISTINCT t.id), 0) as transaction_count,
  COALESCE(SUM(ti.quantity * (p.price - p.cost)), 0) as total_profit,
  CASE 
    WHEN COUNT(DISTINCT DATE(t.transaction_date)) > 0 
    THEN SUM(ti.quantity) / COUNT(DISTINCT DATE(t.transaction_date))
    ELSE 0
  END as daily_velocity
FROM products p
LEFT JOIN transaction_items ti ON p.id = ti.product_id
LEFT JOIN transactions t ON ti.transaction_id = t.id
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.category, p.price, p.cost;

-- Current layout view
CREATE OR REPLACE VIEW current_store_layout AS
SELECT 
  sz.id as zone_id,
  sz.name as zone_name,
  sz.zone_type,
  sz.visibility_score,
  sz.position_x,
  sz.position_y,
  sz.capacity,
  p.id as product_id,
  p.name as product_name,
  p.category
FROM store_zones sz
LEFT JOIN product_placements pp ON sz.id = pp.zone_id AND pp.is_current = TRUE
LEFT JOIN products p ON pp.product_id = p.id;
