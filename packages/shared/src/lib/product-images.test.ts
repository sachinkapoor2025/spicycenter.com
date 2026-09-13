import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_IMAGE_MIN_EDGE_PX,
  mergeProductImages,
  resolveProductImagesForUpsert,
  selectDisplayableProductImages,
} from "./product-images";
import { resolveProductImageUrl } from "./image-url";

describe("selectDisplayableProductImages", () => {
  it("drops tiny thumbnails when sharper frames exist", () => {
    const urls = selectDisplayableProductImages([
      { url: "/a.jpg", width: 500, height: 500 },
      { url: "/a-thumb.jpg", width: 100, height: 100 },
      { url: "/a-b.jpg", width: 100, height: 100 },
      { url: "/a2.jpg", width: 1500, height: 1500 },
    ]);
    assert.deepEqual(urls, ["/a.jpg", "/a2.jpg"]);
  });

  it("keeps the largest frame when all are below the min edge", () => {
    const urls = selectDisplayableProductImages([
      { url: "/tiny-a.jpg", width: 100, height: 100 },
      { url: "/tiny-b.jpg", width: 120, height: 120 },
    ]);
    assert.deepEqual(urls, ["/tiny-b.jpg"]);
  });

  it("keeps 300px masters used as the sole product image", () => {
    const urls = selectDisplayableProductImages([{ url: "/only.jpg", width: 300, height: 300 }]);
    assert.deepEqual(urls, ["/only.jpg"]);
    assert.ok(300 >= PRODUCT_IMAGE_MIN_EDGE_PX);
  });
});

describe("mergeProductImages / resolveProductImagesForUpsert", () => {
  it("keeps admin gallery images when import only has the featured image", () => {
    const imported = ["https://cdn.example/uploads/featured.jpeg"];
    const existing = [
      "https://cdn.example/uploads/featured.jpeg",
      "https://cdn.example/products/a.png",
      "https://cdn.example/products/b.jpeg",
      "https://cdn.example/products/c.jpeg",
    ];
    const merged = mergeProductImages(imported, existing);
    assert.equal(merged.length, 4);
    const safe = resolveProductImagesForUpsert(imported, existing);
    assert.equal(safe.images.length, 4);
    assert.equal(safe.preservedExisting, false);
  });

  it("never shrinks an existing gallery unless allowShrink is set", () => {
    const incoming = ["https://cdn.example/uploads/only.jpeg"];
    const existing = [
      "https://cdn.example/products/1.jpeg",
      "https://cdn.example/products/2.jpeg",
      "https://cdn.example/products/3.jpeg",
    ];
    // Default: merge keeps all existing + new featured
    const safe = resolveProductImagesForUpsert(incoming, existing);
    assert.equal(safe.images.length, 4);
    assert.equal(safe.preservedExisting, false);

    // Empty incoming must not wipe gallery
    const empty = resolveProductImagesForUpsert([], existing);
    assert.deepEqual(empty.images, existing);
    assert.equal(empty.preservedExisting, true);

    // Explicit replace may shrink
    const forced = resolveProductImagesForUpsert(incoming, existing, { allowShrink: true });
    assert.deepEqual(forced.images, incoming);
    assert.equal(forced.preservedExisting, false);
  });
});

describe("resolveProductImageUrl", () => {
  it("rewrites relative /uploads paths to the product CDN", () => {
    assert.equal(
      resolveProductImageUrl("/uploads/orange-county/TFUSA007/TFUSA007.jpg"),
      "https://d2lfdzx32wxe94.cloudfront.net/uploads/orange-county/TFUSA007/TFUSA007.jpg"
    );
  });

  it("rewrites legacy WordPress upload URLs to the CDN", () => {
    assert.equal(
      resolveProductImageUrl("https://spicycenter.com/wp-content/uploads/2026/03/photo.jpg"),
      "https://d2lfdzx32wxe94.cloudfront.net/uploads/2026/03/photo.jpg"
    );
  });
});
