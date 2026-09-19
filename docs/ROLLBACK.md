# Amplify / storefront rollback

This is the runbook. Executing a production rollback still needs an owner on AWS Amplify.

## What a bad deploy usually is

- Wrong `Host` / sitemap domain (should be `https://www.spicycenter.com`)
- Broken enquiry or checkout
- Indexing thin URLs (city farms, 100k keyword pages)

## Before promote

1. Confirm Amplify `NEXT_PUBLIC_SITE_URL=https://www.spicycenter.com` (also hardcoded in `amplify.yml`).
2. Spot-check `/robots.txt`, `/sitemap.xml`, `/enquiry`, `/bulk-enquiry`, `/checkout`.
3. Do not publish generated encyclopaedia copy or overwrite `data/market-prices` history.

## Rollback on Amplify

1. Open the Amplify app for `spicycenter.com`.
2. Hosting → the last known-good job on `main`.
3. Redeploy that job (or revert the git commit on `main` and let CI rebuild).
4. After rollback, curl `https://www.spicycenter.com/robots.txt` and confirm Host is not `*.amplifyapp.com`.

## Git revert (code)

```bash
git revert <bad-commit>
git push origin HEAD
```

API Lambdas are a separate deploy. Revert `apps/api` the same way if enquiry/honeypot/status enums were the failure.

## What we will not do from code alone

- Restore GSC/GA4 history
- Un-publish search-indexed thin pages that never shipped
- Guarantee traffic after rollback
