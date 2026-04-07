-- ============================================
-- WebsiteBio Subscription System Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'inactive', -- active, canceled, past_due, trialing, inactive
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50), -- succeeded, failed, pending, refunded
    paid_at TIMESTAMP WITH TIME ZONE,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ADMIN USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_customer_id ON payment_history(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR SUBSCRIPTIONS
-- ============================================
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all subscriptions
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- RLS POLICIES FOR PAYMENT HISTORY
-- ============================================
-- Users can view their own payment history
CREATE POLICY "Users can view own payment history"
    ON payment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM subscriptions
            WHERE subscriptions.user_id = auth.uid()
            AND subscriptions.stripe_customer_id = payment_history.stripe_customer_id
        )
    );

-- Service role can manage all payment history
CREATE POLICY "Service role can manage payment history"
    ON payment_history FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- RLS POLICIES FOR ADMIN USERS
-- ============================================
-- Admin users can view admin table
CREATE POLICY "Admin users can view admin table"
    ON admin_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Service role can manage admin table
CREATE POLICY "Service role can manage admin"
    ON admin_users FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- RLS POLICIES FOR USER PROFILES
-- ============================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage profiles"
    ON user_profiles FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION TO CREATE USER PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ADMIN FUNCTION - Grant admin role
-- ============================================
CREATE OR REPLACE FUNCTION grant_admin(user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO admin_users (user_id, role)
    VALUES (user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW FOR ADMIN DASHBOARD
-- ============================================
CREATE OR REPLACE VIEW subscription_stats AS
SELECT 
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscribers,
    COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_subscribers,
    COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscribers,
    COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trialing_subscribers,
    COUNT(*) as total_users,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_subscribers_last_30_days
FROM subscriptions;

-- ============================================
-- VIEW FOR REVENUE METRICS
-- ============================================
CREATE OR REPLACE VIEW revenue_metrics AS
SELECT 
    DATE_TRUNC('month', paid_at) as month,
    COUNT(*) as total_payments,
    SUM(amount) as total_revenue,
    AVG(amount) as average_payment,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
FROM payment_history
WHERE status = 'succeeded'
GROUP BY DATE_TRUNC('month', paid_at)
ORDER BY month DESC;

-- ============================================
-- INSERT EXAMPLE ADMIN USER (Replace with actual user_id)
-- ============================================
-- INSERT INTO admin_users (user_id, role) VALUES ('your-user-id-here', 'admin');
