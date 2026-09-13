import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eproloAuth,
  eproloAuthHeaders,
  eproloSign,
  redactEproloUrl,
  withEproloQuery,
} from "./eprolo-sign";

describe("eprolo-sign", () => {
  it("uses MD5(key + timestamp + secret) uppercase by default", () => {
    const a = eproloSign("KEY", "SECRET", "1700000000000");
    assert.equal(a, a.toUpperCase());
    assert.equal(a.length, 32);
    assert.notEqual(a, eproloSign("KEY", "SECRET", "1700000000000", "md5-key-secret-timestamp"));
  });

  it("puts key, timestamp, and sign on headers and query", () => {
    const auth = eproloAuth("KEY", "SECRET", "md5-key-timestamp-secret", 1700000000000);
    assert.equal(auth.headers.apiKey, "KEY");
    assert.equal(auth.query.sign, auth.headers.sign);
    assert.equal(auth.headers.timestamp, "1700000000000");
    assert.equal(auth.headers.sign, eproloSign("KEY", "SECRET", "1700000000000"));
    const url = withEproloQuery("https://openapi.eprolo.com/openapi/", auth.query);
    assert.match(url, /sign=/);
    assert.equal(eproloAuthHeaders("KEY", "SECRET", "md5-key-timestamp-secret", 1700000000000).sign, auth.sign);
  });

  it("redacts secrets from ping URLs", () => {
    const url = redactEproloUrl(
      "https://openapi.eprolo.com/openapi/?apiKey=ABCDEF&timestamp=1&sign=DEADBEEF"
    );
    assert.match(url, /apiKey=REDACTED/);
    assert.match(url, /sign=REDACTED/);
    assert.doesNotMatch(url, /ABCDEF/);
    assert.doesNotMatch(url, /DEADBEEF/);
  });
});
