#!/usr/bin/env node
/**
 * Static isolation checks for Agmarknet secret names and deploy guards.
 * Does not call AWS and must never print secret values.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const template = readFileSync(resolve(root, "infrastructure/template.yaml"), "utf8");
const workflow = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf8");
const samconfig = readFileSync(resolve(root, "infrastructure/samconfig.toml"), "utf8");

const errors = [];
function check(ok, message) {
  if (!ok) errors.push(message);
}

check(
  template.includes("AGMARKNET_SECRET_NAME: !Sub agmarknet/api-key-${Environment}"),
  "SAM Globals must derive AGMARKNET_SECRET_NAME from Environment"
);
check(
  !/AGMARKNET_SECRET_NAME:\s*agmarknet\/api-key\s*$/m.test(template),
  "SAM must not hardcode the shared secret name agmarknet/api-key"
);
check(
  template.includes("secret:agmarknet/api-key-${Environment}-*"),
  "Fetcher IAM must be scoped to agmarknet/api-key-${Environment}-*"
);
check(
  !template.includes("secret:agmarknet/api-key*"),
  "Fetcher IAM must not use agmarknet/api-key* (that matches every env plus the legacy name)"
);
check(
  template.includes("Value: !Sub agmarknet/api-key-${Environment}"),
  "Stack output AgmarknetSecretName must be env-derived"
);

check(samconfig.includes('stack_name = "spicycorner-dev"'), "samconfig default stack must be spicycorner-dev");
check(samconfig.includes('stack_name = "spicycorner-prod"'), "samconfig prod stack must be spicycorner-prod");
check(
  !samconfig.includes("agmarknet/api-key-prod") && !samconfig.includes("agmarknet/api-key-dev"),
  "samconfig must not duplicate secret names (Environment is the source of truth)"
);

check(workflow.includes('agmarknet_secret_name="agmarknet/api-key-dev"'), "dev mapping must use agmarknet/api-key-dev");
check(workflow.includes('agmarknet_secret_name="agmarknet/api-key-prod"'), "prod mapping must use agmarknet/api-key-prod");
check(
  !workflow.includes('NAME="agmarknet/api-key"'),
  "workflow must not write the legacy shared secret name"
);
check(
  workflow.includes('workflow_dispatch environment=dev is allowed only from the dev branch'),
  "manual dev deploy must be restricted to the dev branch"
);
check(
  workflow.includes('workflow_dispatch environment=prod is allowed only from main'),
  "manual prod deploy must be restricted to main"
);
check(
  workflow.includes('Push to ${REF_NAME}: validation only'),
  "feature-branch pushes must stay validation-only"
);
check(
  workflow.includes("needs.resolve-target.outputs.environment == 'prod' && github.ref_name == 'main'"),
  "deploy jobs must require prod+main"
);
check(
  workflow.includes("needs.resolve-target.outputs.environment == 'dev' && github.ref_name == 'dev'"),
  "deploy jobs must require dev+dev"
);
check(
  !workflow.includes("echo \"$AGMARKNET_API_KEY\"") && !workflow.includes("echo '${AGMARKNET_API_KEY}'"),
  "workflow must not echo the Agmarknet API key"
);

function functionBody(source, name) {
  const match = source.match(new RegExp(`${name}\\(\\) \\{[\\s\\S]*?\\n          \\}`));
  return match?.[0] ?? "";
}
const applyDev = functionBody(workflow, "apply_dev");
const applyProd = functionBody(workflow, "apply_prod");
check(applyDev.includes('agmarknet_secret_name="agmarknet/api-key-dev"'), "apply_dev must set agmarknet/api-key-dev");
check(!applyDev.includes("agmarknet/api-key-prod"), "development mapping must not reference agmarknet/api-key-prod");
check(applyProd.includes('agmarknet_secret_name="agmarknet/api-key-prod"'), "apply_prod must set agmarknet/api-key-prod");
check(!applyProd.includes("agmarknet/api-key-dev"), "production mapping must not reference agmarknet/api-key-dev");

if (errors.length) {
  console.error("Agmarknet isolation checks failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Agmarknet isolation checks passed (static repository files only; live AWS was not queried).");
