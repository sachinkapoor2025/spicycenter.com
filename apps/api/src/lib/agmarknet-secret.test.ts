import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAgmarknetSecretName } from "./agmarknet";

const originalSecret = process.env.AGMARKNET_SECRET_NAME;
const originalEnv = process.env.ENVIRONMENT;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.AGMARKNET_SECRET_NAME;
  else process.env.AGMARKNET_SECRET_NAME = originalSecret;
  if (originalEnv === undefined) delete process.env.ENVIRONMENT;
  else process.env.ENVIRONMENT = originalEnv;
});

describe("resolveAgmarknetSecretName", () => {
  it("uses an allowed explicit secret name", () => {
    process.env.AGMARKNET_SECRET_NAME = "agmarknet/api-key-prod";
    delete process.env.ENVIRONMENT;
    assert.equal(resolveAgmarknetSecretName(), "agmarknet/api-key-prod");
  });

  it("derives the name from ENVIRONMENT when the explicit var is missing", () => {
    delete process.env.AGMARKNET_SECRET_NAME;
    process.env.ENVIRONMENT = "dev";
    assert.equal(resolveAgmarknetSecretName(), "agmarknet/api-key-dev");
  });

  it("refuses the legacy shared name and other unexpected names", () => {
    process.env.AGMARKNET_SECRET_NAME = "agmarknet/api-key";
    assert.throws(() => resolveAgmarknetSecretName(), /unexpected Agmarknet secret name/);
    process.env.AGMARKNET_SECRET_NAME = "agmarknet/api-key-prod*";
    assert.throws(() => resolveAgmarknetSecretName(), /unexpected Agmarknet secret name/);
  });
});
