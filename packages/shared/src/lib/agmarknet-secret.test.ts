import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AGMARKNET_SECRET_ENVIRONMENTS,
  LEGACY_SHARED_AGMARKNET_SECRET_NAME,
  agmarknetSecretName,
  isAllowedAgmarknetSecretName,
} from "./agmarknet-commodities";

describe("agmarknetSecretName", () => {
  it("maps each environment to an isolated secret name", () => {
    assert.equal(agmarknetSecretName("dev"), "agmarknet/api-key-dev");
    assert.equal(agmarknetSecretName("staging"), "agmarknet/api-key-staging");
    assert.equal(agmarknetSecretName("prod"), "agmarknet/api-key-prod");
  });

  it("does not return the legacy shared name", () => {
    for (const environment of AGMARKNET_SECRET_ENVIRONMENTS) {
      assert.notEqual(agmarknetSecretName(environment), LEGACY_SHARED_AGMARKNET_SECRET_NAME);
    }
  });

  it("rejects unknown environments", () => {
    assert.throws(() => agmarknetSecretName("production"), /Invalid Agmarknet environment/);
    assert.throws(() => agmarknetSecretName(""), /Invalid Agmarknet environment/);
  });
});

describe("isAllowedAgmarknetSecretName", () => {
  it("allows only env-suffixed names", () => {
    assert.equal(isAllowedAgmarknetSecretName("agmarknet/api-key-dev"), true);
    assert.equal(isAllowedAgmarknetSecretName("agmarknet/api-key-prod"), true);
    assert.equal(isAllowedAgmarknetSecretName("agmarknet/api-key-staging"), true);
  });

  it("rejects the legacy shared name and wildcards", () => {
    assert.equal(isAllowedAgmarknetSecretName(LEGACY_SHARED_AGMARKNET_SECRET_NAME), false);
    assert.equal(isAllowedAgmarknetSecretName("agmarknet/api-key*"), false);
    assert.equal(isAllowedAgmarknetSecretName("agmarknet/api-key-prod*"), false);
    assert.equal(isAllowedAgmarknetSecretName("agmarknet/api-key-dev*"), false);
  });

  it("keeps prod and dev names distinct", () => {
    assert.notEqual(agmarknetSecretName("prod"), agmarknetSecretName("dev"));
    assert.equal(isAllowedAgmarknetSecretName(agmarknetSecretName("prod")), true);
    assert.equal(isAllowedAgmarknetSecretName(agmarknetSecretName("dev")), true);
  });
});
