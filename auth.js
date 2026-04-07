/**
 * Authentication utilities for WebsiteBio
 * Handles session management, auth state, and API calls
 */

// Auth configuration
const AUTH_CONFIG = {
    API_BASE: '/api',
    SESSION_KEY: 'websitebio_session',
    USER_KEY: 'websitebio_user',
    SUBSCRIPTION_KEY: 'websitebio_subscription',
    SESSION_CHECK_INTERVAL: 5 * 60 * 1000 // 5 minutes
};

// Get stored session
function getSession() {
    try {
        const sessionJson = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
        return sessionJson ? JSON.parse(sessionJson) : null;
    } catch (e) {
        console.error('Error parsing session:', e);
        return null;
    }
}

// Get stored user
function getUser() {
    try {
        const userJson = localStorage.getItem(AUTH_CONFIG.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.error('Error parsing user:', e);
        return null;
    }
}

// Get stored subscription
function getSubscription() {
    try {
        const subJson = localStorage.getItem(AUTH_CONFIG.SUBSCRIPTION_KEY);
        return subJson ? JSON.parse(subJson) : null;
    } catch (e) {
        console.error('Error parsing subscription:', e);
        return null;
    }
}

// Check if user is authenticated
function isAuthenticated() {
    const session = getSession();
    if (!session || !session.access_token) {
        return false;
    }
    
    // Check if token might be expired
    if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        if (expiresAt < now) {
            return false;
        }
    }
    
    return true;
}

// Check if user is a subscriber (active or trialing)
function isSubscriber() {
    const subscription = getSubscription();
    return subscription && (subscription.status === 'active' || subscription.status === 'trialing');
}

// Check if user is admin
function isAdmin() {
    const user = getUser();
    // Could also check via API, but for now check stored flag
    return user && user.is_admin === true;
}

// Save session data
function saveSession(session, user, subscription) {
    if (session) {
        localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
    }
    if (user) {
        localStorage.setItem(AUTH_CONFIG.USER_KEY, JSON.stringify(user));
    }
    if (subscription) {
        localStorage.setItem(AUTH_CONFIG.SUBSCRIPTION_KEY, JSON.stringify(subscription));
    }
}

// Clear session data (logout)
function clearSession() {
    localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_KEY);
    localStorage.removeItem(AUTH_CONFIG.SUBSCRIPTION_KEY);
}

// Get auth headers for API calls
function getAuthHeaders() {
    const session = getSession();
    if (!session || !session.access_token) {
        return {};
    }
    return {
        'Authorization': `Bearer ${session.access_token}`
    };
}

// Verify session with server
async function verifySession() {
    try {
        const headers = getAuthHeaders();
        if (Object.keys(headers).length === 0) {
            return { authenticated: false };
        }

        const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/session`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        });

        const data = await response.json();
        
        if (data.authenticated) {
            // Update stored data with fresh data
            saveSession(
                getSession(), // Keep existing session
                data.user,
                data.subscription
            );
            return data;
        } else {
            // Session invalid, clear storage
            clearSession();
            return { authenticated: false };
        }
    } catch (error) {
        console.error('Session verification failed:', error);
        return { authenticated: false };
    }
}

// Logout user
async function logout() {
    try {
        const headers = getAuthHeaders();
        await fetch(`${AUTH_CONFIG.API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        });
    } catch (e) {
        console.error('Logout API error (ignoring):', e);
    }
    
    clearSession();
    window.location.href = '/login.html';
}

// Redirect if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    return true;
}

// Redirect if not a subscriber
function requireSubscription() {
    if (!requireAuth()) return false;
    
    if (!isSubscriber()) {
        window.location.href = '/subscription.html?upgrade=true';
        return false;
    }
    return true;
}

// Redirect if not admin
function requireAdmin() {
    if (!requireAuth()) return false;
    
    if (!isAdmin()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Check and refresh subscription status
async function checkSubscriptionStatus() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${AUTH_CONFIG.API_BASE}/subscription/status`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Update stored subscription
            localStorage.setItem(AUTH_CONFIG.SUBSCRIPTION_KEY, JSON.stringify(data.subscription));
            return data;
        }
        return null;
    } catch (error) {
        console.error('Subscription status check failed:', error);
        return null;
    }
}

// Start session monitoring
function startSessionMonitor(onAuthChange) {
    setInterval(async () => {
        if (isAuthenticated()) {
            const result = await verifySession();
            if (onAuthChange && !result.authenticated) {
                onAuthChange(false);
            }
        }
    }, AUTH_CONFIG.SESSION_CHECK_INTERVAL);
}

// Make authenticated API call
async function authFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    // Handle 401 - session expired
    if (response.status === 401) {
        clearSession();
        window.location.href = '/login.html?session_expired=true';
        throw new Error('Session expired');
    }

    return response;
}

// Export for use
window.auth = {
    getSession,
    getUser,
    getSubscription,
    isAuthenticated,
    isSubscriber,
    isAdmin,
    saveSession,
    clearSession,
    getAuthHeaders,
    verifySession,
    logout,
    requireAuth,
    requireSubscription,
    requireAdmin,
    checkSubscriptionStatus,
    startSessionMonitor,
    fetch: authFetch
};

console.log('Auth module loaded');