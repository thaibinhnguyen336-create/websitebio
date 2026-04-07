/**
 * Admin Dashboard JavaScript
 * Handles admin functionality, charts, and data management
 */

// Global state for pagination
let subscribersState = {
    page: 1,
    limit: 20,
    status: 'all',
    search: ''
};

// Initialize admin dashboard
async function initAdminDashboard() {
    // Check authentication and admin status
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html?redirect=admin/dashboard.html';
        return;
    }

    // For demo, assume user is admin (in production, verify via API)
    const user = auth.getUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    // Set up event listeners
    setupEventListeners();

    // Load dashboard data
    await loadDashboardData();
}

function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            auth.logout();
        });
    }

    // Refresh
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboardData);
    }
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        const response = await auth.fetch('/api/admin/dashboard');
        
        if (response.status === 403) {
            // Not admin - redirect to main site
            window.location.href = '/index.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load dashboard');
        }

        const data = await response.json();

        // Update stats
        updateStats(data.stats, data.revenue);
        
        // Update last updated time
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }

        // Update charts
        if (window.Charts) {
            window.Charts.updateStatusChart(data.stats);
            window.Charts.updateRevenueChart(data.revenue);
        }

        // Update recent items
        updateRecentSubscribers(data.recent_subscribers);
        updateRecentPayments(data.recent_payments);

        // Check for alerts
        checkAlerts(data.stats);

    } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

function updateStats(stats, revenue) {
    // Update stat cards
    const elements = {
        totalUsers: stats?.total_users || 0,
        activeSubs: stats?.active_subscribers || 0,
        mrr: `$${revenue?.mrr || 0}`,
        newSubs: stats?.new_subscribers_30_days || 0
    };

    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function updateRecentSubscribers(subscribers) {
    const container = document.getElementById('recentSubscribers');
    if (!container) return;

    if (!subscribers || subscribers.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent subscribers</div>';
        return;
    }

    container.innerHTML = subscribers.map(sub => `
        <div class="recent-item">
            <div class="recent-icon">
                <i class="fas fa-user"></i>
            </div>
            <div class="recent-content">
                <span class="recent-title">${sub.user_profiles?.email || 'Unknown'}</span>
                <span class="recent-meta">${sub.status} • ${formatDate(sub.created_at)}</span>
            </div>
        </div>
    `).join('');
}

function updateRecentPayments(payments) {
    const container = document.getElementById('recentPayments');
    if (!container) return;

    if (!payments || payments.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent payments</div>';
        return;
    }

    container.innerHTML = payments.map(payment => `
        <div class="recent-item">
            <div class="recent-icon ${payment.status === 'succeeded' ? 'success' : 'danger'}">
                <i class="fas fa-${payment.status === 'succeeded' ? 'check' : 'times'}"></i>
            </div>
            <div class="recent-content">
                <span class="recent-title">$${parseFloat(payment.amount).toFixed(2)}</span>
                <span class="recent-meta">${payment.status} • ${formatDate(payment.paid_at)}</span>
            </div>
        </div>
    `).join('');
}

function checkAlerts(stats) {
    const section = document.getElementById('alertsSection');
    const grid = document.getElementById('alertsGrid');
    
    const alerts = [];

    // Check for past due subscriptions
    if (stats?.past_due > 0) {
        alerts.push({
            type: 'warning',
            icon: 'exclamation-triangle',
            title: 'Past Due Subscriptions',
            message: `${stats.past_due} subscription(s) have failed payments`
        });
    }

    // Check for high cancellation rate (simplified check)
    const cancelRate = stats?.total_users > 0 ? stats.canceled / stats.total_users : 0;
    if (cancelRate > 0.3) {
        alerts.push({
            type: 'info',
            icon: 'info-circle',
            title: 'High Cancellation Rate',
            message: `${Math.round(cancelRate * 100)}% of users have canceled`
        });
    }

    if (alerts.length > 0) {
        section.style.display = 'block';
        grid.innerHTML = alerts.map(alert => `
            <div class="alert alert-${alert.type}">
                <i class="fas fa-${alert.icon}"></i>
                <div>
                    <strong>${alert.title}</strong>
                    <p>${alert.message}</p>
                </div>
            </div>
        `).join('');
    } else {
        section.style.display = 'none';
    }
}

// Initialize subscribers page
function initSubscribersPage() {
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html?redirect=admin/subscribers.html';
        return;
    }

    setupSubscribersEventListeners();
    loadSubscribers();
}

function setupSubscribersEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
    });

    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', loadSubscribers);

    // Filters
    document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
        subscribersState.page = 1;
        applyFilters();
    });

    document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            subscribersState.page = 1;
            applyFilters();
        }
    });

    // Pagination
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (subscribersState.page > 1) {
            subscribersState.page--;
            loadSubscribers();
        }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        subscribersState.page++;
        loadSubscribers();
    });

    // Modal close
    document.getElementById('closeModalBtn')?.addEventListener('click', closeSubscriberModal);
    document.getElementById('closeModalBtn2')?.addEventListener('click', closeSubscriberModal);
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    
    subscribersState.status = statusFilter?.value || 'all';
    subscribersState.search = searchInput?.value || '';
    
    loadSubscribers();
}

function clearFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (statusFilter) statusFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    
    subscribersState.status = 'all';
    subscribersState.search = '';
    subscribersState.page = 1;
    
    loadSubscribers();
}

async function loadSubscribers() {
    const tbody = document.getElementById('subscribersTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-cell">
                <i class="fas fa-spinner fa-spin"></i> Loading subscribers...
            </td>
        </tr>
    `;

    try {
        const params = new URLSearchParams({
            page: subscribersState.page,
            limit: subscribersState.limit,
            status: subscribersState.status,
            search: subscribersState.search
        });

        const response = await auth.fetch(`/api/admin/subscribers?${params}`);
        
        if (!response.ok) {
            throw new Error('Failed to load subscribers');
        }

        const data = await response.json();
        
        renderSubscribersTable(data.subscribers, data.pagination);

    } catch (error) {
        console.error('Load subscribers error:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-cell">
                    Failed to load subscribers. <button class="btn-link" onclick="loadSubscribers()">Retry</button>
                </td>
            </tr>
        `;
    }
}

function renderSubscribersTable(subscribers, pagination) {
    const tbody = document.getElementById('subscribersTableBody');
    const pageInfo = document.getElementById('pageInfo');
    const showingCount = document.getElementById('showingCount');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (!subscribers || subscribers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    No subscribers found
                </td>
            </tr>
        `;
        updatePagination(0, pagination);
        return;
    }

    tbody.innerHTML = subscribers.map(sub => `
        <tr data-id="${sub.id}">
            <td>${sub.email}</td>
            <td>${sub.full_name || '-'}</td>
            <td><span class="status-badge ${sub.status}">${sub.status}</span></td>
            <td>${sub.current_period_end ? formatDate(sub.current_period_end) : '-'}</td>
            <td>${formatDate(sub.created_at)}</td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="viewSubscriber('${sub.id}')">
                    View
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination(subscribers.length, pagination);
}

function updatePagination(count, pagination) {
    const pageInfo = document.getElementById('pageInfo');
    const showingCount = document.getElementById('showingCount');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (pageInfo && pagination) {
        pageInfo.textContent = `Page ${pagination.page} of ${pagination.total_pages}`;
    }

    if (showingCount && pagination) {
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = start + count - 1;
        showingCount.textContent = `Showing ${start}-${end} of ${pagination.total} subscribers`;
    }

    if (prevBtn) prevBtn.disabled = !pagination || pagination.page <= 1;
    if (nextBtn) nextBtn.disabled = !pagination || pagination.page >= pagination.total_pages;
}

async function viewSubscriber(id) {
    const modal = document.getElementById('subscriberModal');
    const modalBody = document.getElementById('modalBody');

    modal.style.display = 'flex';
    modalBody.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const response = await auth.fetch(`/api/admin/subscription/${id}`);
        
        if (!response.ok) {
            throw new Error('Failed to load subscriber');
        }

        const data = await response.json();
        
        renderSubscriberModal(data);

    } catch (error) {
        console.error('View subscriber error:', error);
        modalBody.innerHTML = '<div class="error-message">Failed to load subscriber details</div>';
    }
}

function renderSubscriberModal(data) {
    const modalBody = document.getElementById('modalBody');
    const subscription = data.subscription;
    const payments = data.payment_history || [];

    modalBody.innerHTML = `
        <div class="subscriber-detail">
            <div class="detail-section">
                <h4>User Information</h4>
                <div class="detail-row">
                    <span class="label">Email:</span>
                    <span class="value">${subscription.email}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Name:</span>
                    <span class="value">${subscription.full_name || '-'}</span>
                </div>
            </div>

            <div class="detail-section">
                <h4>Subscription Status</h4>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value"><span class="status-badge ${subscription.status}">${subscription.status}</span></span>
                </div>
                <div class="detail-row">
                    <span class="label">Current Period:</span>
                    <span class="value">${subscription.current_period_start ? formatDate(new Date(subscription.current_period_start)) + ' - ' + formatDate(new Date(subscription.current_period_end)) : '-'}</span>
                </div>
                ${subscription.cancel_at_period_end ? `
                <div class="detail-row">
                    <span class="label">Cancel:</span>
                    <span class="value warning">Will cancel at period end</span>
                </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h4>Payment History</h4>
                ${payments.length > 0 ? `
                    <table class="detail-table">
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                        ${payments.slice(0, 5).map(p => `
                            <tr>
                                <td>${formatDate(new Date(p.paid_at || p.created_at))}</td>
                                <td>$${parseFloat(p.amount).toFixed(2)}</td>
                                <td><span class="status-badge ${p.status}">${p.status}</span></td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p class="empty-text">No payment history</p>'}
            </div>
        </div>
    `;

    // Setup action buttons
    const cancelBtn = document.getElementById('cancelSubModalBtn');
    if (subscription.status === 'active' || subscription.status === 'trialing') {
        cancelBtn.style.display = 'inline-flex';
        cancelBtn.onclick = () => cancelSubscriber(subscription.id);
    } else {
        cancelBtn.style.display = 'none';
    }
}

function closeSubscriberModal() {
    const modal = document.getElementById('subscriberModal');
    modal.style.display = 'none';
}

async function cancelSubscriber(id) {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
        const response = await auth.fetch(`/api/admin/subscription/${id}`, {
            method: 'POST',
            body: JSON.stringify({ action: 'cancel' })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to cancel');
        }

        showToast('Subscription cancelled successfully', 'success');
        closeSubscriberModal();
        loadSubscribers();

    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Initialize revenue page
function initRevenuePage() {
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html?redirect=admin/revenue.html';
        return;
    }

    // Setup period selector
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', loadRevenueData);
    }

    setupEventListeners();
    loadRevenueData();
}

async function loadRevenueData() {
    const period = document.getElementById('periodSelect')?.value || '30';

    try {
        const response = await auth.fetch(`/api/admin/revenue?period=${period}`);
        
        if (!response.ok) {
            throw new Error('Failed to load revenue data');
        }

        const data = await response.json();
        
        updateRevenueStats(data);
        renderRevenueChart(data.chart_data);
        renderPaymentsTable(data.chart_data.flatMap(m => {
            // This is simplified - in real app would have more detailed payment data
            return [];
        }));

    } catch (error) {
        console.error('Load revenue error:', error);
        showToast('Failed to load revenue data', 'error');
    }
}

function updateRevenueStats(data) {
    const summary = data.summary || {};
    const growth = data.growth || {};

    const elements = {
        totalRevenue: `$${summary.total_revenue?.toFixed(2) || '0.00'}`,
        mrrValue: `$${summary.mrr || 0}`,
        totalPayments: summary.payment_count || 0,
        avgPayment: `$${summary.average_payment?.toFixed(2) || '0.00'}`
    };

    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    // Growth indicator
    const growthSection = document.getElementById('growthSection');
    if (growth) {
        growthSection.style.display = 'block';
        const indicator = document.getElementById('growthIndicator');
        const percent = document.getElementById('growthPercent');

        const growthValue = growth.revenue_growth || 0;
        percent.textContent = `${growthValue > 0 ? '+' : ''}${growthValue}%`;
        
        indicator.className = `growth-indicator ${growthValue >= 0 ? 'positive' : 'negative'}`;
        indicator.querySelector('i').className = `fas fa-arrow-${growthValue >= 0 ? 'up' : 'down'}`;
    }
}

function renderRevenueChart(chartData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    // Destroy existing chart
    if (window.revenueChartInstance) {
        window.revenueChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    
    const labels = chartData.map(d => d.month);
    const values = chartData.map(d => d.revenue);

    window.revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue ($)',
                data: values,
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `$${value}`
                    }
                }
            }
        }
    });
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    // This would show more detailed payment data
    // For now, simplified
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">View full payment details in revenue API</td></tr>';
}

// Chart utilities
window.Charts = {
    updateStatusChart(stats) {
        const canvas = document.getElementById('statusChart');
        if (!canvas) return;

        if (window.statusChartInstance) {
            window.statusChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        const data = [
            stats?.active_subscribers || 0,
            stats?.trialing || 0,
            stats?.past_due || 0,
            stats?.canceled || 0,
            stats?.inactive || 0
        ];

        window.statusChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Trialing', 'Past Due', 'Canceled', 'Inactive'],
                datasets: [{
                    data,
                    backgroundColor: [
                        '#10b981',
                        '#8b5cf6',
                        '#ef4444',
                        '#f59e0b',
                        '#9ca3af'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    },

    updateRevenueChart(revenue) {
        // Handled by renderRevenueChart for revenue page
    }
};

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}