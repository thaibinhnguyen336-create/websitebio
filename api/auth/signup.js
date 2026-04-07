/**
 * Signup API Endpoint
 * Creates a new user in Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, fullName } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters',
                code: 'WEAK_PASSWORD'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format',
                code: 'INVALID_EMAIL'
            });
        }

        // Create user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email for easier signup
            user_metadata: {
                full_name: fullName || ''
            }
        });

        if (authError) {
            console.error('Auth signup error:', authError);
            
            // Handle specific errors
            if (authError.message.includes('already been registered')) {
                return res.status(400).json({ 
                    error: 'An account with this email already exists',
                    code: 'USER_EXISTS'
                });
            }
            
            return res.status(400).json({ 
                error: authError.message || 'Failed to create account',
                code: 'SIGNUP_FAILED'
            });
        }

        const user = authData.user;

        // Create initial inactive subscription record
        const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                status: 'inactive'
            });

        if (subError) {
            console.error('Subscription creation error:', subError);
            // Continue anyway - subscription can be created later
        }

        console.log('New user signup:', email);

        // Return success with user info (without password)
        return res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};