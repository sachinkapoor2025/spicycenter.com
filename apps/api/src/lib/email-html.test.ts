import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlFromPlainText } from "./email";

describe("htmlFromPlainText", () => {
  it("escapes script, image handlers, ampersands, quotes, and angle brackets", () => {
    const html = htmlFromPlainText(
      `<script>alert(1)</script>\n<img onerror="alert('x')">\nA & B "quoted"`
    );
    assert.equal(
      html,
      "&lt;script&gt;alert(1)&lt;/script&gt;<br>&lt;img onerror=&quot;alert(&#39;x&#39;)&quot;&gt;<br>A &amp; B &quot;quoted&quot;"
    );
    assert.doesNotMatch(html, /<script>/i);
    assert.doesNotMatch(html, /<img /i);
  });

  it("keeps user-supplied tags as literal text while preserving line breaks", () => {
    const html = htmlFromPlainText("Need cumin <b>whole</b> & turmeric.\nPlease quote.");
    assert.equal(html, "Need cumin &lt;b&gt;whole&lt;/b&gt; &amp; turmeric.<br>Please quote.");
    assert.match(html, /<br>/);
    assert.doesNotMatch(html, /<b>/);
  });

  it("does not turn user <br> tags into extra markup", () => {
    assert.equal(htmlFromPlainText("a<br>b\nc"), "a&lt;br&gt;b<br>c");
  });
});
