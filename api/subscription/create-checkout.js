/**
 * Create Checkout Session API Endpoint
 * Creates a Stripe Checkout session with first month discount
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

        if (subError && subError.code !== 'PGRST116') {
            console.error('Error fetching subscription:', subError);
        }

        let stripeCustomerId = subscription?.stripe_customer_id;

        // Create Stripe customer if doesn't exist
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: user.id,
                    supabase_user_id: user.id
                }
            });
            
            stripeCustomerId = customer.id;

            // Save customer ID to subscription
            await supabase
                .from('subscriptions')
                .upsert({
                    user_id: user.id,
                    stripe_customer_id: stripeCustomerId,
                    status: 'pending'
                }, { onConflict: 'user_id' });
        }

        // Get current subscription status to determine pricing
        const isNewSubscriber = !subscription || subscription.status === 'inactive';
        
        // Build checkout session parameters
        const sessionParams = {
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1
                }
            ],
            success_url: `${req.headers.origin}/subscription.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/subscription.html?canceled=true`,
            metadata: {
                user_id: user.id,
                supabase_user_id: user.id
            },
            subscription_data: {
                metadata: {
                    user_id: user.id,
                    supabase_user_id: user.id
                }
            }
        };

        // Apply first month discount if new subscriber
        if (isNewSubscriber && process.env.STRIPE_FIRST_MONTH_COUPON_ID) {
            sessionParams.discounts = [{
                coupon: process.env.STRIPE_FIRST_MONTH_COUPON_ID
            }];
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log('Checkout session created for:', user.email, 'New subscriber:', isNewSubscriber);

        return res.status(200).json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Create checkout error:', error);
        
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ 
                error: error.message,
                code: 'CARD_ERROR'
            });
        }
        
        return res.status(500).json({ 
            error: 'Failed to create checkout session',
            code: 'CHECKOUT_FAILED'
        });
    }
};