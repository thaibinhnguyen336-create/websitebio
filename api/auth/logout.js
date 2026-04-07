/**
 * Logout API Endpoint
 * Signs out the user and invalidates the session
 */

const { createClient } = require('@supabase/supabase-js');

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
        // Get the Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'No valid authorization token provided',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify and invalidate the session
        const { error: signOutError } = await supabase.auth.signOut(token);

        if (signOutError) {
            console.error('Logout error:', signOutError);
            return res.status(400).json({ 
                error: 'Failed to sign out',
                code: 'LOGOUT_FAILED'
            });
        }

        console.log('User logged out');

        return res.status(200).json({
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};