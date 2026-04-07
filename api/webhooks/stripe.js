/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscription lifecycle management
 */

const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createClient = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Webhook event handler
async function handleWebhookEvent(event) {
    const eventType = event.type;
    const data = event.data.object;

    console.log('Processing webhook event:', eventType);

    switch (eventType) {
        // ========================================
        // CHECKOUT EVENTS
        // ========================================
        case 'checkout.session.completed': {
            const subscriptionId = data.subscription;
            const customerId = data.customer;
            const userId = data.metadata?.user_id || data.metadata?.supabase_user_id;

            if (!userId) {
                console.error('No user_id in metadata for checkout.session.completed');
                return;
            }

            // Get subscription details from Stripe
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            // Update subscription record
            await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    stripe_price_id: subscription.items.data[0].price.id,
                    status: 'active',
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            console.log('Subscription activated for user:', userId);
            break;
        }

        // ========================================
        // SUBSCRIPTION EVENTS
        // ========================================
        case 'customer.subscription.created': {
            const subscriptionId = data.id;
            const customerId = data.customer;
            
            // Find user by customer ID
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('user_id')
                .eq('stripe_customer_id', customerId)
                .single();

            if (subData?.user_id) {
                await supabase
                    .from('subscriptions')
                    .update({
                        stripe_subscription_id: subscriptionId,
                        stripe_price_id: data.items.data[0].price.id,
                        status: data.status === 'trialing' ? 'trialing' : 'active',
                        current_period_start: new Date(data.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(data.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: data.cancel_at_period_end,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', subData.user_id);

                console.log('Subscription created for user:', subData.user_id);
            }
            break;
        }

        case 'customer.subscription.updated': {
            const subscriptionId = data.id;
            const customerId = data.customer;
            const status = data.status;
            const periodEnd = data.current_period_end;

            // Find user by subscription ID
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('user_id')
                .eq('stripe_subscription_id', subscriptionId)
                .single();

            if (subData?.user_id) {
                // Map Stripe status to our status
                let dbStatus = status;
                if (status === 'active' && data.cancel_at_period_end) {
                    dbStatus = 'active'; // Still active until period end
                } else if (status === 'canceled') {
                    dbStatus = data.cancel_at_period_end ? 'active' : 'canceled';
                }

                await supabase
                    .from('subscriptions')
                    .update({
                        stripe_price_id: data.items.data[0].price.id,
                        status: dbStatus,
                        current_period_start: new Date(data.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(periodEnd * 1000).toISOString(),
                        cancel_at_period_end: data.cancel_at_period_end,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', subData.user_id);

                console.log('Subscription updated for user:', subData.user_id, 'Status:', dbStatus);
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscriptionId = data.id;

            // Find user by subscription ID
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('user_id')
                .eq('stripe_subscription_id', subscriptionId)
                .single();

            if (subData?.user_id) {
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'canceled',
                        stripe_subscription_id: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', subData.user_id);

                console.log('Subscription deleted/canceled for user:', subData.user_id);
            }
            break;
        }

        // ========================================
        // INVOICE EVENTS
        // ========================================
        case 'invoice.paid': {
            const invoiceId = data.id;
            const customerId = data.customer;
            const amountPaid = data.amount_paid / 100; // Convert from cents
            const currency = data.currency;
            const paidAt = new Date(data.created * 1000).toISOString();

            // Find subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .single();

            if (subData?.id) {
                // Add payment record
                await supabase
                    .from('payment_history')
                    .insert({
                        subscription_id: subData.id,
                        stripe_customer_id: customerId,
                        stripe_invoice_id: invoiceId,
                        amount: amountPaid,
                        currency: currency.toUpperCase(),
                        status: 'succeeded',
                        paid_at: paidAt,
                        description: data.description || 'Subscription payment'
                    });

                console.log('Payment recorded for invoice:', invoiceId, 'Amount:', amountPaid);
            }
            break;
        }

        case 'invoice.payment_failed': {
            const customerId = data.customer;

            // Update subscription status
            await supabase
                .from('subscriptions')
                .update({
                    status: 'past_due',
                    updated_at: new Date().toISOString()
                })
                .eq('stripe_customer_id', customerId);

            console.log('Payment failed for customer:', customerId);
            break;
        }

        case 'invoice.payment_succeeded': {
            // Similar to invoice.paid but handled by that event
            break;
        }

        // ========================================
        // CUSTOMER EVENTS
        // ========================================
        case 'customer.created': {
            const customerId = data.id;
            const email = data.email;

            // Could update any pending subscriptions
            console.log('Customer created in Stripe:', customerId, email);
            break;
        }

        case 'customer.updated': {
            const customerId = data.id;
            // Handle customer metadata updates if needed
            console.log('Customer updated in Stripe:', customerId);
            break;
        }

        default:
            console.log('Unhandled webhook event type:', eventType);
    }
}

// Main handler function
module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // Verify webhook signature
    try {
        if (sig && webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // For testing without signature verification
            event = JSON.parse(req.body);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    try {
        await handleWebhookEvent(event);
        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
};