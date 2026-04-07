/**
 * Login API Endpoint
 * Authenticates user and returns session
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with anon key for auth
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Attempt to sign in
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            console.error('Login error:', authError);
            
            // Handle specific errors
            if (authError.message.includes('Invalid login credentials')) {
                return res.status(401).json({ 
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }
            
            if (authError.message.includes('Email not confirmed')) {
                return res.status(401).json({ 
                    error: 'Please verify your email address',
                    code: 'EMAIL_NOT_CONFIRMED'
                });
            }
            
            return res.status(401).json({ 
                error: authError.message || 'Login failed',
                code: 'LOGIN_FAILED'
            });
        }

        const { user, session } = authData;

        // Get subscription status
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        console.log('User logged in:', email);

        // Return success with session and subscription info
        return res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || null
            },
            subscription: subscription || null,
            session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_in: session.expires_in,
                expires_at: session.expires_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};