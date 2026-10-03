# SpicyCenter deployment

Storefront publishing is Amplify’s GitHub connection (`amplify.yml`). This guide covers the GitHub Actions SAM deploy in `.github/workflows/deploy.yml`.

## Branch mapping

| Trigger | Stack | `Environment` | Agmarknet secret |
| --- | --- | --- | --- |
| Push `main` | `spicycorner-prod` | `prod` | `agmarknet/api-key-prod` |
| Push `dev` | `spicycorner-dev` | `dev` | `agmarknet/api-key-dev` |
| Push `feature/**` | none | — | Validation only (no AWS deploy) |
| Dispatch `prod` from `main` | `spicycorner-prod` | `prod` | `agmarknet/api-key-prod` |
| Dispatch `dev` from `dev` | `spicycorner-dev` | `dev` | `agmarknet/api-key-dev` |
| Dispatch `prod` from any other branch | refused | — | — |
| Dispatch `dev` from any other branch | refused | — | — |

`infrastructure/samconfig.toml` is the stack-name source: `default` → `spicycorner-dev`, `prod` → `spicycorner-prod`.

## Prerequisites

- GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AGMARKNET_API_KEY`, plus the existing payment/SMTP secrets the workflow already passes through.
- GitHub variable or secret `AWS_REGION`.
- Env-specific Secrets Manager names `agmarknet/api-key-prod` and `agmarknet/api-key-dev`. The workflow may create those names; it must **not** create, update, or delete the legacy shared name `agmarknet/api-key`.
- Do not log or paste secret values.

## Commands (local / operator)

```bash
# Validation only — no AWS writes
npm run validate:agmarknet-isolation
npm test
npm run test -w @spicycorner/api

# Dev stack (only when you intend to update spicycorner-dev)
cd infrastructure
sam build --config-env default
sam deploy --config-env default --parameter-overrides "Environment=dev"
```

Production is promoted by merging `dev` → `main` (or dispatching **Deploy** with `environment=prod` from `main`). Review the PR first. Merging `main` runs the production SAM deploy.

## Rollback

1. Revert the bad commit on the same branch and push, or redeploy the last known-good commit.
2. If the production Agmarknet fetcher cannot read `agmarknet/api-key-prod`, point `spicycenter-agmarknet-fetcher-prod` back at the unused legacy secret `agmarknet/api-key` only as an emergency, then revert the template. Do not delete either secret while debugging.
3. Amplify rollback is separate (`docs/ROLLBACK.md`).

## Known gaps

- The workflow uses one AWS IAM user for both stacks. Isolation is by stack name and secret name, not separate credentials.
- GitHub Environments with required reviewers are not configured in this repo file.
- Amplify may still auto-build `dev` independently of this workflow. Confirm that in the Amplify console.
