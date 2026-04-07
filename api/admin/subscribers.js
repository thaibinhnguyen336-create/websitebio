/**
 * Admin Subscribers API Endpoint
 * List all subscribers with pagination and filtering
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const createClient = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

        // Parse query parameters
        const { 
            page = 1, 
            limit = 20, 
            status, 
            search,
            sort_by = 'created_at',
            sort_order = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 100); // Cap at 100
        const offset = (pageNum - 1) * limitNum;

        // Build query
        let query = supabase
            .from('subscriptions')
            .select(`
                *,
                user_profiles(email, full_name)
            `, { count: 'exact' });

        // Apply filters
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (search) {
            // Search by email in user_profiles
            query = query.ilike('user_profiles.email', `%${search}%`);
        }

        // Apply sorting
        const validSortFields = ['created_at', 'updated_at', 'status', 'current_period_end'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
        const sortDir = sort_order === 'asc' ? 'asc' : 'desc';

        query = query.order(sortField, { ascending: sortDir === 'asc' });

        // Apply pagination
        query = query.range(offset, offset + limitNum - 1);

        const { data: subscribers, error, count } = await query;

        if (error) {
            console.error('Error fetching subscribers:', error);
            return res.status(500).json({ 
                error: 'Failed to fetch subscribers',
                code: 'FETCH_FAILED'
            });
        }

        // Format response
        const formattedSubscribers = (subscribers || []).map(sub => ({
            id: sub.id,
            user_id: sub.user_id,
            email: sub.user_profiles?.email || 'Unknown',
            full_name: sub.user_profiles?.full_name || null,
            status: sub.status,
            stripe_customer_id: sub.stripe_customer_id,
            stripe_subscription_id: sub.stripe_subscription_id,
            current_period_start: sub.current_period_start,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
            created_at: sub.created_at,
            updated_at: sub.updated_at
        }));

        return res.status(200).json({
            subscribers: formattedSubscribers,
            pagination: {
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                total_pages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (error) {
        console.error('Admin subscribers error:', error);
        return res.status(500).json({ 
            error: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        });
    }
};