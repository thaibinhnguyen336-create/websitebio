/**
 * Admin Revenue API Endpoint
 * Get revenue analytics and metrics
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

        // Get time period from query (default: 30 days)
        const { period = '30' } = req.query;
        const days = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get all successful payments
        const { data: payments, error: payError } = await supabase
            .from('payment_history')
            .select('*')
            .eq('status', 'succeeded')
            .gte('paid_at', startDate.toISOString())
            .order('paid_at', { ascending: false });

        if (payError) {
            console.error('Error fetching payments:', payError);
            return res.status(500).json({ 
                error: 'Failed to fetch payment data',
                code: 'FETCH_FAILED'
            });
        }

        // Calculate totals
        const totalRevenue = payments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
        const paymentCount = payments?.length || 0;
        const averagePayment = paymentCount > 0 ? totalRevenue / paymentCount : 0;

        // Calculate MRR (active subscribers * $30)
        const { data: activeSubs } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('status', 'active');

        const mrr = (activeSubs?.length || 0) * 30;

        // Group by month for chart data
        const monthlyData = {};
        payments?.forEach(p => {
            const month = new Date(p.paid_at).toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, count: 0 };
            }
            monthlyData[month].revenue += parseFloat(p.amount) || 0;
            monthlyData[month].count += 1;
        });

        const chartData = Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                revenue: Math.round(data.revenue * 100) / 100,
                count: data.count
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Calculate growth (compare to previous period)
        const previousStart = new Date(startDate);
        previousStart.setDate(previousStart.getDate() - days);
        
        const { data: prevPayments } = await supabase
            .from('payment_history')
            .select('amount')
            .eq('status', 'succeeded')
            .gte('paid_at', previousStart.toISOString())
            .lt('paid_at', startDate.toISOString());

        const prevRevenue = prevPayments?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0;
        const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        return res.status(200).json({
            summary: {
                total_revenue: Math.round(totalRevenue * 100) / 100,
                mrr: mrr,
                payment_count: paymentCount,
                average_payment: Math.round(averagePayment * 100) / 100,
                period_days: days
            },
            growth: {
                revenue_growth: Math.round(revenueGrowth * 10) / 10,
                previous_period_revenue: Math.round(prevRevenue * 100) / 100
            },
            chart_data: chartData,
            period_start: startDate.toISOString(),
            period_end: new Date().toISOString()
        });

    } catch (error) {
        console.error('Admin revenue error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};