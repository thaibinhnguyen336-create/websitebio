/**
 * Subscription Management JavaScript
 * Handles subscription UI interactions and API calls
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html?redirect=subscription.html';
        return;
    }

    // Initialize UI
    initializeUI();
    await loadSubscriptionStatus();

    // Set up event listeners
    setupEventListeners();
});

function initializeUI() {
    // Set user info
    const user = auth.getUser();
    if (user) {
        document.getElementById('userEmail').textContent = user.email || 'Unknown';
        document.getElementById('userName').textContent = user.full_name || 'Free User';
    }

    // Handle URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        showToast('Payment successful! Your subscription is now active.', 'success');
        // Clear URL params
        window.history.replaceState({}, document.title, 'subscription.html');
    } else if (urlParams.get('canceled') === 'true') {
        showToast('Subscription process was canceled.', 'info');
        window.history.replaceState({}, document.title, 'subscription.html');
    }
}

async function loadSubscriptionStatus() {
    const loadingEl = document.getElementById('subscriptionLoading');
    const contentEl = document.getElementById('subscriptionContent');
    const errorEl = document.getElementById('subscriptionError');

    try {
        const response = await auth.fetch('/api/subscription/status');
        
        if (!response.ok) {
            throw new Error('Failed to fetch subscription');
        }

        const data = await response.json();
        const subscription = data.subscription;

        // Update stored subscription
        localStorage.setItem('websitebio_subscription', JSON.stringify(subscription));

        // Hide loading, show content
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';

        // Show appropriate subscription card
        displaySubscriptionCard(subscription);

        // Show payment history if available
        if (data.payment_history && data.payment_history.length > 0) {
            displayPaymentHistory(data.payment_history);
        }

    } catch (error) {
        console.error('Load subscription error:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

function displaySubscriptionCard(subscription) {
    const activeCard = document.getElementById('activeSubscription');
    const inactiveCard = document.getElementById('inactiveSubscription');
    const pastDueCard = document.getElementById('pastDueSubscription');
    const historySection = document.getElementById('paymentHistorySection');

    // Reset all cards
    activeCard.style.display = 'none';
    inactiveCard.style.display = 'none';
    pastDueCard.style.display = 'none';
    historySection.style.display = 'none';

    const status = subscription?.status || 'inactive';

    switch (status) {
        case 'active':
        case 'trialing':
            activeCard.style.display = 'block';
            historySection.style.display = 'block';
            
            // Show trial badge if trialing
            if (status === 'trialing') {
                document.getElementById('trialBadge').style.display = 'inline-flex';
            }
            
            // Format period dates
            if (subscription.current_period_start && subscription.current_period_end) {
                const start = new Date(subscription.current_period_start);
                const end = new Date(subscription.current_period_end);
                document.getElementById('periodDates').textContent = 
                    `${formatDate(start)} - ${formatDate(end)}`;
            }
            
            // Show cancel warning if canceling
            if (subscription.cancel_at_period_end) {
                document.getElementById('cancelRow').style.display = 'flex';
            }
            
            // Show first month discount info (could be calculated based on subscription age)
            // For simplicity, we'll hide it - in production you'd track this
            document.getElementById('firstMonthDiscount').style.display = 'none';
            break;

        case 'past_due':
            pastDueCard.style.display = 'block';
            historySection.style.display = 'block';
            break;

        case 'canceled':
        case 'inactive':
        default:
            inactiveCard.style.display = 'block';
            break;
    }
}

function displayPaymentHistory(payments) {
    const historySection = document.getElementById('paymentHistorySection');
    const tbody = document.getElementById('paymentHistoryBody');
    const noPayments = document.getElementById('noPayments');
    const tableContainer = historySection.querySelector('.history-table-container');

    if (!payments || payments.length === 0) {
        tableContainer.style.display = 'none';
        noPayments.style.display = 'block';
        return;
    }

    tableContainer.style.display = 'block';
    noPayments.style.display = 'none';

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>${formatDate(new Date(payment.paid_at || payment.created_at))}</td>
            <td>$${parseFloat(payment.amount).toFixed(2)} ${(payment.currency || 'usd').toUpperCase()}</td>
            <td><span class="payment-status ${payment.status}">${payment.status}</span></td>
            <td>
                ${payment.stripe_invoice_id ? 
                    `<a href="#" class="invoice-link" data-invoice="${payment.stripe_invoice_id}">View</a>` : 
                    '-'}
            </td>
        </tr>
    `).join('');
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        auth.logout();
    });

    // Subscribe button
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', createCheckoutSession);
    }

    // Manage billing button
    const manageBillingBtn = document.getElementById('manageBillingBtn');
    if (manageBillingBtn) {
        manageBillingBtn.addEventListener('click', openCustomerPortal);
    }

    // Cancel subscription button
    const cancelSubBtn = document.getElementById('cancelSubBtn');
    if (cancelSubBtn) {
        cancelSubBtn.addEventListener('click', showCancelModal);
    }

    // Update payment button (past due)
    const updatePaymentBtn = document.getElementById('updatePaymentBtn');
    if (updatePaymentBtn) {
        updatePaymentBtn.addEventListener('click', openCustomerPortal);
    }

    // Retry button
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadSubscriptionStatus);
    }

    // Cancel modal
    setupCancelModal();
}

function setupCancelModal() {
    const modal = document.getElementById('cancelModal');
    const closeBtn = document.getElementById('cancelModalClose');
    const confirmBtn = document.getElementById('confirmCancelBtn');
    const periodEndDate = document.getElementById('periodEndDate');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    confirmBtn.addEventListener('click', async () => {
        const cancelType = document.querySelector('input[name="cancelType"]:checked').value;
        const immediate = cancelType === 'immediate';
        
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';

        try {
            const response = await auth.fetch('/api/subscription/cancel', {
                method: 'POST',
                body: JSON.stringify({ immediate })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to cancel');
            }

            modal.style.display = 'none';
            showToast(data.message, 'success');
            
            // Reload subscription status
            await loadSubscriptionStatus();

        } catch (error) {
            showToast(error.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirm Cancellation';
        }
    });
}

function showCancelModal() {
    const modal = document.getElementById('cancelModal');
    const subscription = auth.getSubscription();
    
    // Set period end date
    if (subscription?.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        document.getElementById('periodEndDate').textContent = formatDate(endDate);
    }

    modal.style.display = 'flex';
}

async function createCheckoutSession() {
    const btn = document.getElementById('subscribeBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        const response = await auth.fetch('/api/subscription/create-checkout', {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create checkout');
        }

        // Redirect to Stripe Checkout
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('No checkout URL received');
        }

    } catch (error) {
        showToast(error.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-rocket"></i> Subscribe Now';
        }
    }
}

async function openCustomerPortal() {
    const btn = document.getElementById('manageBillingBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }

    try {
        const response = await auth.fetch('/api/subscription/portal', {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to open billing portal');
        }

        // Redirect to Stripe Customer Portal
        if (data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('No portal URL received');
        }

    } catch (error) {
        showToast(error.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cog"></i> Manage Billing';
        }
    }
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    // Style
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
        max-width: 350px;
        font-size: 0.9rem;
    `;

    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}