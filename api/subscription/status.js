/**
 * Subscription Status API Endpoint
 * Get current subscription status for the user
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const createClient = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

        // Verify user
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
            return res.status(401).json({ 
                error: 'Invalid session',
                code: 'INVALID_TOKEN'
            });
        }

        // Get user's subscription record
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (subError && subError.code !== 'PGRST116') {
            console.error('Error fetching subscription:', subError);
            return res.status(500).json({ 
                error: 'Failed to fetch subscription status',
                code: 'FETCH_FAILED'
            });
        }

        // Get recent payment history
        let paymentHistory = [];
        if (subscription?.stripe_customer_id) {
            const { data: payments } = await supabase
                .from('payment_history')
                .select('*')
                .eq('stripe_customer_id', subscription.stripe_customer_id)
                .order('created_at', { ascending: false })
                .limit(10);
            
            paymentHistory = payments || [];
        }

        // Return subscription details
        return res.status(200).json({
            subscription: subscription || {
                user_id: user.id,
                status: 'inactive'
            },
            payment_history: paymentHistory,
            is_subscribed: subscription?.status === 'active' || subscription?.status === 'trialing',
            can_generate: subscription?.status === 'active' || subscription?.status === 'trialing'
        });

    } catch (error) {
        console.error('Subscription status error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};