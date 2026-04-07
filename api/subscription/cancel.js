/**
 * Cancel Subscription API Endpoint
 * Cancels the user's subscription (at period end or immediately)
 */

const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createClient = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
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

        // Get request body
        const { cancel_at_period_end = true, immediate = false } = req.body;

        // Get user's subscription record
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (subError) {
            console.error('Error fetching subscription:', subError);
            return res.status(400).json({ 
                error: 'Subscription not found',
                code: 'NO_SUBSCRIPTION'
            });
        }

        // Check if there's an active Stripe subscription
        if (!subscription?.stripe_subscription_id) {
            return res.status(400).json({ 
                error: 'No active subscription to cancel',
                code: 'NO_ACTIVE_SUBSCRIPTION'
            });
        }

        // Cancel based on preference
        if (immediate) {
            // Cancel immediately
            await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
            
            // Update local database
            await supabase
                .from('subscriptions')
                .update({
                    status: 'canceled',
                    cancel_at_period_end: false,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            console.log('Subscription canceled immediately for:', user.email);

            return res.status(200).json({
                message: 'Subscription canceled successfully',
                canceled_at: new Date().toISOString()
            });
        } else {
            // Cancel at period end
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: true
            });

            // Update local database
            await supabase
                .from('subscriptions')
                .update({
                    cancel_at_period_end: true,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            console.log('Subscription scheduled for cancellation at period end for:', user.email);

            return res.status(200).json({
                message: 'Subscription will be canceled at the end of the billing period',
                cancel_at: subscription.current_period_end
            });
        }

    } catch (error) {
        console.error('Cancel subscription error:', error);
        
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ 
                error: error.message,
                code: 'CARD_ERROR'
            });
        }
        
        return res.status(500).json({ 
            error: 'Failed to cancel subscription',
            code: 'CANCEL_FAILED'
        });
    }
};