-- BankOffer AI Database Schema
-- Initialization script for PostgreSQL

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- Customers & Profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    life_stage VARCHAR(50),
    risk_tolerance INT CHECK (risk_tolerance >= 1 AND risk_tolerance <= 10),
    avg_monthly_income DECIMAL(12, 2),
    avg_monthly_spending DECIMAL(12, 2),
    profile_score DECIMAL(5, 2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_customer_id ON customer_profiles(customer_id);

-- ============================================================================
-- Products & Offers
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(50) NOT NULL,
    description TEXT,
    min_balance DECIMAL(12, 2),
    interest_rate DECIMAL(5, 3),
    annual_fee DECIMAL(10, 2),
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    offer_score DECIMAL(5, 2),
    personalization_reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON offers(customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_product_id ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at);

-- ============================================================================
-- Transactions
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(100),
    merchant VARCHAR(255),
    transaction_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- ============================================================================
-- Notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    channel VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    message_text TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);

-- ============================================================================
-- Audit & Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- Sample Data
-- ============================================================================

INSERT INTO products (product_name, product_type, description, min_balance, interest_rate, annual_fee, features)
VALUES
    ('Premium Savings', 'savings', 'High-yield savings account', 1000.00, 4.5, 0.00, '{"benefits": ["high_interest", "free_transfers"]}'::JSONB),
    ('Platinum Credit Card', 'credit_card', 'Premium credit card with rewards', 0.00, 0.00, 99.00, '{"benefits": ["cashback", "travel_insurance", "concierge"]}'::JSONB),
    ('Growth ETF Portfolio', 'investment', 'Diversified ETF investment portfolio', 10000.00, 0.00, 25.00, '{"benefits": ["diversification", "low_fees"]}'::JSONB),
    ('Life Insurance Plan', 'insurance', 'Comprehensive life insurance coverage', 0.00, 0.00, 0.00, '{"benefits": ["term_life", "family_protection"]}'::JSONB),
    ('Home Loan', 'loan', 'Competitive home mortgage rates', 50000.00, 3.5, 0.00, '{"benefits": ["low_rates", "flexible_terms"]}'::JSONB)
ON CONFLICT DO NOTHING;

-- Create demo customer
INSERT INTO customers (customer_id, first_name, last_name, email, phone, date_of_birth)
VALUES ('demo-001', 'John', 'Doe', 'john.doe@example.com', '+1-555-0100', '1985-05-15')
ON CONFLICT DO NOTHING;

-- Create demo profile
INSERT INTO customer_profiles (customer_id, life_stage, risk_tolerance, avg_monthly_income, avg_monthly_spending, profile_score)
SELECT id, 'young_family', 6, 5000.00, 3000.00, 78.5
FROM customers
WHERE customer_id = 'demo-001'
ON CONFLICT DO NOTHING;

-- Create sample transactions
INSERT INTO transactions (customer_id, transaction_date, amount, category, merchant, transaction_type)
SELECT
    c.id,
    CURRENT_DATE - (random() * 90)::int,
    (random() * 500 + 10)::decimal(12,2),
    (ARRAY['groceries', 'dining', 'gas', 'utilities', 'entertainment'])[1 + (random() * 4)::int],
    'Sample Merchant',
    'debit'
FROM customers c
WHERE c.customer_id = 'demo-001'
LIMIT 50;

-- ============================================================================
-- Agent Runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    users_notified INT DEFAULT 0,
    result_summary JSONB,
    triggered_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
