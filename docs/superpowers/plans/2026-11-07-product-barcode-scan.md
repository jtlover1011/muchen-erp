# 商品扫码 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a LAN paired mobile barcode scanner that matches product records on the desktop ERP.

**Architecture:** Add an optional barcode field to products and an independent nav page. Use a Vite development middleware for a session-scoped paired scan inbox; the desktop page polls it and matches exact barcodes. The mobile route uses the camera over HTTPS and posts decoded values to the inbox.

**Tech Stack:** Existing React 19, TypeScript, Vite 6; a browser barcode decoding library only if native support is insufficient; HTTPS certificates for the local LAN host.

**Spec:** `docs/superpowers/specs/product-barcode-scan.md`

## Global Constraints
- Do not change inventory or order data when a barcode is scanned.
- Keep existing browser data backward compatible.
- Do not transmit scans outside the local network in this version.

## Review Focus
- Existing product records without a barcode still load.
- Duplicate barcode mappings cannot silently match multiple products.
- A disconnected phone or expired pairing token cannot submit scans.
- Unknown barcodes remain visible for later resolution.
- Camera permission denial has a clear recovery message.

---

### Task 1: Product barcode data and binding UI
**Files:** Modify `src/types.ts`, `src/model.ts`, `src/productFields.tsx`, `src/pages/ProductCreatePage.tsx`.
- [ ] Add optional barcode to product normalization and drafts.
- [ ] Show/edit barcode on product create and edit forms.
- [ ] Add a validated store action to attach a unique barcode to a product.

### Task 2: LAN scan inbox
**Files:** Modify `vite.config.ts`; create `src/scanApi.ts`.
- [ ] Add a session token and bounded in-memory scan queue exposed through local-only API routes.
- [ ] Reject missing/invalid pairing tokens and malformed scan values.
- [ ] Expose pending scans to desktop clients and acknowledge consumed scans.

### Task 3: Desktop scan page and phone camera page
**Files:** Create `src/pages/ProductScanPage.tsx` and `src/pages/MobileScanPage.tsx`; modify `src/App.tsx`, `src/nav.ts`, `src/store.tsx`.
- [ ] Add a first-level “商品扫码” menu page with pairing QR, matched product details, unknown scan queue, and barcode binding.
- [ ] Add a phone route that requests camera permission, decodes product barcodes, suppresses immediate duplicates, and posts to the LAN inbox.
- [ ] Document how to start LAN HTTPS and open the pairing QR on a phone.

### Task 4: Review
- [ ] Run `git diff --check` and inspect that scan handlers do not mutate stock or order state.
- [ ] Do not add or run automated tests unless requested.
