-- Initialize database schema for customer churn analytics

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    signup_date DATE NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    location VARCHAR(100),
    subscription_type VARCHAR(50),
    monthly_charges DECIMAL(10,2),
    total_charges DECIMAL(10,2),
    contract_length VARCHAR(20),
    payment_method VARCHAR(50),
    paperless_billing BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create usage metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
    metric_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    metric_date DATE NOT NULL,
    login_count INTEGER DEFAULT 0,
    session_duration_minutes INTEGER DEFAULT 0,
    features_used INTEGER DEFAULT 0,
    support_tickets INTEGER DEFAULT 0,
    data_usage_gb DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create churn events table
CREATE TABLE IF NOT EXISTS churn_events (
    event_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    churn_date DATE NOT NULL,
    churn_reason VARCHAR(200),
    is_voluntary BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feature store table for ML features
CREATE TABLE IF NOT EXISTS feature_store (
    feature_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    feature_date DATE NOT NULL,
    tenure_days INTEGER,
    avg_monthly_usage DECIMAL(10,2),
    support_ticket_rate DECIMAL(5,4),
    payment_delay_days INTEGER,
    feature_adoption_score DECIMAL(5,4),
    engagement_score DECIMAL(5,4),
    churn_risk_score DECIMAL(5,4),
    lifetime_value DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_signup_date ON customers(signup_date);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_customer_date ON usage_metrics(customer_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_churn_events_customer ON churn_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_feature_store_customer_date ON feature_store(customer_id, feature_date);

-- Insert sample data
INSERT INTO customers (customer_code, signup_date, age, gender, location, subscription_type, monthly_charges, total_charges, contract_length, payment_method, paperless_billing) VALUES
('CUST001', '2023-01-15', 34, 'M', 'New York', 'Premium', 89.99, 1079.88, 'Annual', 'Credit Card', true),
('CUST002', '2023-02-20', 28, 'F', 'California', 'Basic', 29.99, 359.88, 'Monthly', 'Bank Transfer', false),
('CUST003', '2023-03-10', 45, 'M', 'Texas', 'Enterprise', 149.99, 1799.88, 'Annual', 'Credit Card', true),
('CUST004', '2023-04-05', 31, 'F', 'Florida', 'Premium', 89.99, 719.92, 'Quarterly', 'PayPal', true),
('CUST005', '2023-05-12', 52, 'M', 'Illinois', 'Basic', 29.99, 239.92, 'Monthly', 'Credit Card', false);

-- Insert sample usage metrics
INSERT INTO usage_metrics (customer_id, metric_date, login_count, session_duration_minutes, features_used, support_tickets, data_usage_gb) VALUES
(1, '2024-01-01', 15, 450, 8, 0, 12.5),
(1, '2024-01-02', 12, 380, 6, 1, 10.2),
(2, '2024-01-01', 5, 120, 3, 2, 3.8),
(2, '2024-01-02', 3, 90, 2, 0, 2.1),
(3, '2024-01-01', 25, 720, 12, 0, 45.2),
(3, '2024-01-02', 22, 680, 11, 0, 42.8);

-- Insert sample churn events
INSERT INTO churn_events (customer_id, churn_date, churn_reason, is_voluntary) VALUES
(2, '2024-01-15', 'Price too high', true),
(4, '2024-01-20', 'Poor customer service', true);
