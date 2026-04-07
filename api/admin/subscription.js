/**
 * Admin Subscription Detail API Endpoint
 * Get or update a specific subscription
 */

const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createClient = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get subscription details
async function getSubscription(req, res, subscriptionId) {
    try {
        // Fetch subscription with user profile
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                user_profiles(email, full_name)
            `)
            .eq('id', subscriptionId)
            .single();

        if (error) {
            console.error('Error fetching subscription:', error);
            return res.status(404).json({ 
                error: 'Subscription not found',
                code: 'NOT_FOUND'
            });
        }

        // Get payment history
        const { data: payments } = await supabase
            .from('payment_history')
            .select('*')
            .eq('stripe_customer_id', subscription.stripe_customer_id)
            .order('created_at', { ascending: false })
            .limit(20);

        return res.status(200).json({
            subscription: {
                ...subscription,
                email: subscription.user_profiles?.email || 'Unknown',
                full_name: subscription.user_profiles?.full_name || null
            },
            payment_history: payments || []
        });

    } catch (error) {
        console.error('Get subscription error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
}

// Update subscription (admin actions)
async function updateSubscription(req, res, subscriptionId) {
    try {
        const { action, ...params } = req.body;

        // Get current subscription
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', subscriptionId)
            .single();

        if (subError || !subscription) {
            return res.status(404).json({ 
                error: 'Subscription not found',
                code: 'NOT_FOUND'
            });
        }

        // Handle different actions
        switch (action) {
            case 'cancel':
                // Cancel at period end via Stripe
                if (subscription.stripe_subscription_id) {
                    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                        cancel_at_period_end: true
                    });
                }

                await supabase
                    .from('subscriptions')
                    .update({
                        cancel_at_period_end: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subscriptionId);

                console.log('Admin cancelled subscription:', subscriptionId);
                return res.status(200).json({
                    message: 'Subscription will be canceled at the end of the billing period',
                    cancel_at: subscription.current_period_end
                });

            case 'reactivate':
                // Reactivate a canceled subscription
                if (subscription.stripe_subscription_id && subscription.cancel_at_period_end) {
                    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                        cancel_at_period_end: false
                    });
                }

                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        cancel_at_period_end: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subscriptionId);

                console.log('Admin reactivated subscription:', subscriptionId);
                return res.status(200).json({
                    message: 'Subscription reactivated successfully'
                });

            case 'extend_trial':
                // Extend trial period (requires Stripe API call)
                const { days } = params;
                if (!days || days < 1 || days > 365) {
                    return res.status(400).json({ 
                        error: 'Invalid number of days (1-365)',
                        code: 'INVALID_DAYS'
                    });
                }

                if (subscription.stripe_subscription_id) {
                    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
                    
                    // Calculate new period end
                    const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
                    const newPeriodEnd = new Date(currentPeriodEnd.getTime() + days * 24 * 60 * 60 * 1000);

                    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                        trial_end: Math.floor(newPeriodEnd.getTime() / 1000),
                        proration_behavior: 'create_prorations'
                    });
                }

                await supabase
                    .from('subscriptions')
                    .update({
                        current_period_end: new Date(
                            new Date(subscription.current_period_end).getTime() + days * 24 * 60 * 60 * 1000
                        ).toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', subscriptionId);

                console.log('Admin extended trial for subscription:', subscriptionId, 'by', days, 'days');
                return res.status(200).json({
                    message: `Trial extended by ${days} days`,
                    new_period_end: new Date(
                        new Date(subscription.current_period_end).getTime() + days * 24 * 60 * 60 * 1000
                    ).toISOString()
                });

            default:
                return res.status(400).json({ 
                    error: 'Invalid action. Available: cancel, reactivate, extend_trial',
                    code: 'INVALID_ACTION'
                });
        }

    } catch (error) {
        console.error('Update subscription error:', error);
        
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ 
                error: error.message,
                code: 'CARD_ERROR'
            });
        }
        
        return res.status(500).json({ 
            error: 'Failed to update subscription',
            code: 'UPDATE_FAILED'
        });
    }
}

// Main handler
module.exports = async function handler(req, res) {
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

        // Extract subscription ID from URL path
        const pathParts = req.url.split('/').filter(p => p);
        const subscriptionId = pathParts[pathParts.length - 1];

        if (!subscriptionId) {
            return res.status(400).json({ 
                error: 'Subscription ID required',
                code: 'MISSING_ID'
            });
        }

        // Route based on HTTP method
        if (req.method === 'GET') {
            return getSubscription(req, res, subscriptionId);
        } else if (req.method === 'PUT' || req.method === 'POST') {
            return updateSubscription(req, res, subscriptionId);
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('Admin subscription handler error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};