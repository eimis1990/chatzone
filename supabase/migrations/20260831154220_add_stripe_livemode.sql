-- Sandbox (test-mode) Stripe subscriptions must not count as revenue in the
-- owner dashboard. Persist Stripe's livemode flag per org; NULL = unknown
-- (legacy rows synced before this column) and is treated as live so real
-- revenue is never hidden by default.
alter table organizations add column if not exists stripe_livemode boolean;

-- Backfill the two orgs that currently hold a subscription: HomeByNB is the
-- real live sub; 3IMIS carries a sandbox sub created from a local checkout.
update organizations set stripe_livemode = true
  where stripe_subscription_id = 'sub_1UAUsKBPga6Qu0zHF8wL3qv2';
update organizations set stripe_livemode = false
  where stripe_subscription_id = 'sub_1U6jW3BtWM4EdzrxeFpjEPwR';
