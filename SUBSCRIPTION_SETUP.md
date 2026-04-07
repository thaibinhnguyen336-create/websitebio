# Stripe Subscription System Setup Guide

This guide provides step-by-step instructions for setting up the Stripe subscription system with Supabase for the WebsiteBio AI Image Generator.

## Overview

The subscription system provides:
- **Tiered Pricing**: $19 first month, $30/month thereafter
- **Supabase Integration**: User authentication and subscription management
- **Stripe Checkout**: Secure payment processing
- **Customer Portal**: Self-service billing management
- **Admin Dashboard**: Full analytics and subscriber management

## Prerequisites

Before starting, you'll need:
1. A **Vercel** account for deployment
2. A **Supabase** account for database and auth
3. A **Stripe** account for payment processing

---

## Phase 1: Supabase Setup

### Step 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the details:
   - **Organization**: Your organization
   - **Name**: websitebio
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
4. Click "Create new project"

### Step 1.2: Get Credentials

Once created, go to **Project Settings → API**:
- Copy `Project URL` → This is `SUPABASE_URL`
- Copy `anon public` key → This is `SUPABASE_ANON_KEY`
- Copy `service_role` key → This is `SUPABASE_SERVICE_ROLE_KEY`

### Step 1.3: Run Database Schema

1. Go to **SQL Editor** in Supabase
2. Copy the contents from `supabase/schema.sql`
3. Paste and run the SQL
4. Verify tables were created:
   - `subscriptions`
   - `payment_history`
   - `admin_users`
   - `user_profiles`

### Step 1.4: Configure Authentication

1. Go to **Authentication → Providers**
2. Enable **Email** provider
3. Settings should be:
   - Enable Email provider: ✅
   - Confirm email: ✅ (or disable for easier testing)
   - Auto-confirm: ⚙️ (based on preference)

---

## Phase 2: Stripe Setup

### Step 2.1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification

### Step 2.2: Get API Keys

1. Go to **Developers → API Keys**
2. Copy the **Secret Key** (starts with `sk_`) → `STRIPE_SECRET_KEY`
3. Copy the **Publishable Key** (starts with `pk_`) → `STRIPE_PUBLISHABLE_KEY`

⚠️ **Important**: Use test keys for development (toggle "View test data" in Stripe Dashboard)

### Step 2.3: Create Product

1. Go to **Products** → Click **+ Add Product**
2. Fill in:
   - **Name**: WebsiteBio Pro
   - **Description**: Unlimited AI image generation
   - **Price**: $30.00/month (recurring)
3. Save the product
4. Copy the **Price ID** (starts with `price_`) → `STRIPE_PRICE_ID`

### Step 2.4: Create First Month Discount Coupon

1. Go to **Coupons** → Click **+ Create**
2. Configure:
   - **Name**: First Month Special
   - **Type**: Percentage off
   - **Amount off**: 37%
   - **Duration**: Once
   - **Redeem by**: [Future date or leave empty]
3. Copy the **Coupon ID** (e.g., `FIRSTMONTH`) → `STRIPE_FIRST_MONTH_COUPON_ID`

### Step 2.5: Configure Webhooks

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter your production URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Phase 3: Vercel Configuration

### Step 3.1: Connect Project

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - Framework: Other
   - Build Command: `echo 'Static site'`
   - Output Directory: `./`

### Step 3.2: Add Environment Variables

Go to **Settings → Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_ID` | `price_...` |
| `STRIPE_FIRST_MONTH_COUPON_ID` | `firstmonth` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `JWT_SECRET` | Generate a random string |
| `WHOMEAI_API_KEY` | Your existing key |

### Step 3.3: Deploy

Click **Deploy** and wait for deployment to complete.

---

## Phase 4: Testing

### Test Cards (Stripe)

Use these test cards for development:

| Card Number | Scenario |
|-------------|----------|
| `4242424242424242` | Successful payment |
| `4000000000000002` | Card declined |
| `4000002500003155` | Expired card |

### Test Flow

1. Visit your deployed site
2. Navigate to `/signup.html`
3. Create an account
4. Try to subscribe (should redirect to Stripe Checkout)
5. Complete payment with test card
6. Verify subscription status at `/subscription.html`

### Webhook Testing

Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Admin Access

### Grant Admin Role

To make yourself an admin:

1. Go to **Supabase → SQL Editor**
2. Run:
```sql
-- Replace with your user ID (find in Authentication → Users)
SELECT id, email FROM auth.users;

-- Grant admin
INSERT INTO admin_users (user_id, role) 
VALUES ('your-user-id', 'admin');
```

### Access Admin Dashboard

Navigate to: `https://your-domain.com/admin/dashboard.html`

---

## File Structure

```
├── api/
│   ├── auth/
│   │   ├── signup.js
│   │   ├── login.js
│   │   ├── logout.js
│   │   └── session.js
│   ├── subscription/
│   │   ├── create-checkout.js
│   │   ├── portal.js
│   │   ├── cancel.js
│   │   └── status.js
│   ├── webhooks/
│   │   └── stripe.js
│   └── admin/
│       ├── dashboard.js
│       ├── subscribers.js
│       ├── subscription.js
│       └── revenue.js
├── login.html
├── signup.html
├── subscription.html
├── auth.js
├── subscription.js
├── admin/
│   ├── dashboard.html
│   ├── subscribers.html
│   ├── revenue.html
│   └── admin.js
├── styles-auth.css
├── styles-subscription.css
├── styles-admin.css
└── supabase/
    └── schema.sql
```

---

## Pricing Logic

The first month discount works as follows:

1. **New subscribers** (no prior active subscription) get the coupon applied automatically
2. **Returning subscribers** ( reactivating) pay full $30

This is handled in `api/subscription/create-checkout.js`:
```javascript
const isNewSubscriber = !subscription || subscription.status === 'inactive';

if (isNewSubscriber && process.env.STRIPE_FIRST_MONTH_COUPON_ID) {
    sessionParams.discounts = [{
        coupon: process.env.STRIPE_FIRST_MONTH_COUPON_ID
    }];
}
```

---

## Troubleshooting

### Common Issues

**"No valid authorization token"**
- Ensure user is logged in
- Check auth token is being sent in headers

**"Webhook signature verification failed"**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check the webhook endpoint URL matches

**"Missing Supabase configuration"**
- Verify all Supabase env vars are set in Vercel
- Check Supabase project is active

**"Coupon not applied"**
- Verify coupon ID is correct
- Check coupon hasn't expired
- Ensure it's set up as "once per customer"

### Check Logs

Vercel:
```bash
vercel logs your-deployment-url
```

Supabase:
- Go to **Database → Logs**

---

## Production Checklist

Before going live:

- [ ] Use production Stripe keys (not test)
- [ ] Enable email confirmation in Supabase (for security)
- [ ] Set up custom domain in Vercel
- [ ] Test full payment flow with real card (use $0 limit)
- [ ] Verify webhook is working
- [ ] Set up Stripe billing alerts
- [ ] Add terms of service and privacy policy

---

## Support

For issues:
1. Check browser console for errors
2. Check Vercel function logs
3. Verify environment variables are correct
4. Check Stripe Dashboard for payment status