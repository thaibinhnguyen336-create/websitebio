/**
 * Session API Endpoint
 * Get current user session and verify token
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get the Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'No authorization token provided',
                code: 'NO_TOKEN',
                authenticated: false
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify the token and get user info
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            console.error('Session verification error:', userError);
            return res.status(401).json({ 
                error: 'Invalid or expired session',
                code: 'INVALID_TOKEN',
                authenticated: false
            });
        }

        // Get subscription status
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Get user profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Check if admin
        const { data: adminData } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', user.id)
            .single();

        return res.status(200).json({
            authenticated: true,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || profile?.full_name || null,
                created_at: user.created_at
            },
            subscription: subscription || { status: 'inactive' },
            profile: profile || null,
            is_admin: !!adminData
        });

    } catch (error) {
        console.error('Session error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
            authenticated: false
        });
    }
};