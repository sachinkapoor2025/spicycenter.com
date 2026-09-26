# Image licenses — SpicyCorner

This document lists image sources used in the storefront and sync scripts. **Only copyright-safe assets are fetched automatically.**

## Safe — used in production

| Asset | Path | License |
|-------|------|---------|
| Product fallback (chilli SVG) | `apps/web/public/product-fallback.svg` | Original work — SpicyCorner project |
| Product placeholder (JPEG) | `apps/web/public/uploads/_placeholder.jpg` | [Pumpkin (cropped)](https://commons.wikimedia.org/wiki/File:Pumpkin_(cropped).jpg) — Wikimedia Commons, public domain |
| Catalogue spice photos | `apps/web/public/images/spices/*.jpg` | Wikimedia Commons photographs of each spice (public domain, CC0, CC BY, or CC BY-SA). Examples: [Muscade](https://commons.wikimedia.org/wiki/File:Muscade.jpg) (nutmeg), [Bhiwapur Chilli - Red Dried](https://commons.wikimedia.org/wiki/File:Bhiwapur_Chilli_-_Red_Dried.jpg), [Green Cardamom Pods](https://commons.wikimedia.org/wiki/File:Green_Cardamom_Pods.jpg) |
| Site logo | `apps/web/public/logo.png` | Original branding — verify you own or commissioned this file |
| Home banners | `apps/web/public/banners/bannerpage1.png`, `bannerpage2.png` | Original branding — verify you own or commissioned these files |
| Testimonial avatars | `apps/web/public/testimonials/*.svg` | Original SVG initials — SpicyCorner project |

## Sync script (`npm run sync:public-uploads`)

- **Allowed:** committed local files (non-Amazon filenames), Wikimedia public-domain missing-image placeholder
- **Blocked:** Amazon `m.media-amazon.com`, legacy WordPress server, Internet Archive Wayback Machine

## Not fetched — user action required

| Risk | Details |
|------|---------|
| Amazon product photos | 11 catalog entries use `imgi_*` filenames from WooCommerce Amazon imports. These are **replaced with the PD missing-image placeholder** by the sync script. Upload your own product photos via admin or S3. |
| Legacy WordPress uploads | ~93 custom filenames point to media that no longer exists on the old server. Sync fills them with the PD placeholder until you add real photos. |
| Unused Rakhi banners | `apps/web/public/banners/banner-*-rakhi*.png` — leftover from another project; not referenced in code. Safe to delete. |

## Product images you upload

When adding product photos through `/admin` or `migrate-images-to-s3.ts` with `LOCAL_UPLOADS_DIR`, you must own the rights or have a license for commercial use.

## External URLs in catalog

Product URLs in `spicycenter-catalog.json` still reference `wp-content/uploads/...` paths for routing only. The app resolves them to `/uploads/...` on Amplify (static mode). No live WordPress fetch occurs at runtime.
