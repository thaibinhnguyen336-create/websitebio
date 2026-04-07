/**
 * Admin Dashboard API Endpoint
 * Get dashboard statistics for admin overview
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createClient = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get authorization token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Authorization required',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify user and check admin status
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
            return res.status(401).json({ 
                error: 'Invalid session',
                code: 'INVALID_TOKEN'
            });
        }

        // Check if user is admin
        const { data: adminData } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (!adminData) {
            return res.status(403).json({ 
                error: 'Admin access required',
                code: 'NOT_ADMIN'
            });
        }

        // Get subscription stats
        const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('status, created_at');

        if (subError) {
            console.error('Error fetching subscriptions:', subError);
            return res.status(500).json({ 
                error: 'Failed to fetch subscription data',
                code: 'FETCH_FAILED'
            });
        }

        // Calculate stats
        const stats = {
            total_users: subscriptions.length,
            active_subscribers: subscriptions.filter(s => s.status === 'active').length,
            trialing: subscriptions.filter(s => s.status === 'trialing').length,
            past_due: subscriptions.filter(s => s.status === 'past_due').length,
            canceled: subscriptions.filter(s => s.status === 'canceled').length,
            inactive: subscriptions.filter(s => s.status === 'inactive').length,
            new_subscribers_30_days: subscriptions.filter(s => {
                const created = new Date(s.created_at);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return created > thirtyDaysAgo;
            }).length
        };

        // Get revenue data
        const { data: payments, error: payError } = await supabase
            .from('payment_history')
            .select('amount, paid_at, status')
            .eq('status', 'succeeded');

        if (payError) {
            console.error('Error fetching payments:', payError);
        }

        // Calculate revenue
        const totalRevenue = payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
        
        // Calculate MRR (simplified - assumes all active subscribers are monthly)
        const mrr = stats.active_subscribers * 30;

        // Get recent payments
        const { data: recentPayments } = await supabase
            .from('payment_history')
            .select('*')
            .eq('status', 'succeeded')
            .order('created_at', { ascending: false })
            .limit(5);

        // Get recent subscribers
        const { data: recentSubscribers } = await supabase
            .from('subscriptions')
            .select('*, user_profiles(email, full_name)')
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(5);

        return res.status(200).json({
            stats,
            revenue: {
                total_revenue: totalRevenue,
                mrr: mrr,
                total_payments: payments?.length || 0
            },
            recent_payments: recentPayments || [],
            recent_subscribers: recentSubscribers || []
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};