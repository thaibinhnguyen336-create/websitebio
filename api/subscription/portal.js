/**
 * Customer Portal API Endpoint
 * Creates a Stripe Customer Portal session for billing management
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

        // Check if user has a Stripe customer ID
        if (!subscription?.stripe_customer_id) {
            return res.status(400).json({ 
                error: 'No billing account found. Please subscribe first.',
                code: 'NO_CUSTOMER'
            });
        }

        // Create customer portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: `${req.headers.origin}/subscription.html`
        });

        console.log('Customer portal session created for:', user.email);

        return res.status(200).json({
            url: portalSession.url
        });

    } catch (error) {
        console.error('Portal session error:', error);
        
        return res.status(500).json({ 
            error: 'Failed to create billing portal session',
            code: 'PORTAL_FAILED'
        });
    }
};