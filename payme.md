# Prompt: Integrate Online Top-Up (Payme) into Existing Payment System

You are working in an existing Node.js + Vue project (`vakolat`) that already has a payment/accounting subsystem.

Your job: implement **online top-up ingestion** (from external payment system) in a way that is fully compatible with the current ledger and UI behavior.

---

## 1) Existing system behavior you must preserve

### Core models (already in project)
- `PaymentAccount`: cached per-user balance (`userNo`, `balance`, `status`, `meta`), unique by `userNo`.
- `PaymentTransaction`: ledger rows (authoritative history) with fields:
  - `userNo`
  - `type`: `top_up | spend | adjustment | migration`
  - `direction`: `in | out`
  - `amount`
  - `source`: currently enum `manual | migration | service`
  - `comment`
  - `createdBy` (User ref)

### Important business flow
- **Top-up API** currently increments `PaymentAccount.balance` and creates `PaymentTransaction` (`type=top_up`, `direction=in`, `source=manual`).
- If account does not exist, top-up path uses upsert/create and account is auto-created.
- Balances can be recalculated from ledger (`PaymentTransaction`) and cache bootstrap exists.
- Transactions endpoint populates `createdBy` with `nickname firstname lastname`, and UI uses `createdBy.nickname` in "Xodim" columns.

### ID card normalization already used
- Canonical `userNo` format is `AAA#########` (AAA + 9 digits).
- Existing normalization helper behavior:
  - If input is exactly 9 digits, prefix `AAA`.
  - Otherwise uppercase and trim.

---

## 2) New feature requirements (Payme side)

Implement a reliable online payment ingestion flow so that:

1. External Payme top-up request creates a **top-up ledger transaction** and updates account balance.
2. If `userNo` account does not exist, create it automatically.
3. `userNo` must be validated/normalized to strict canonical style:
   - Accept `#########` and convert to `AAA#########`.
   - Accept `AAA#########`.
   - Reject everything else with clear 400 error.
4. In UI/history/statistics, initiator ("Xodim") for online top-ups must show as **`Payme`**.
5. Flow must remain safe for both replica-set and standalone Mongo (same optional-transaction strategy already used in project).

---

## 3) Concrete implementation guidance

### A. Backend endpoint for Payme top-up
- Add a dedicated endpoint (example: `POST /api/members/payment/payme/topup`).
- Protect it appropriately for machine-to-machine calls (shared secret/signature/header check).  
  Do not rely on normal xodim JWT if this is server-to-server.
- Request payload minimum:
  - `userNo`
  - `amount`
  - `comment`/`paymentId`/`providerTxId` (at least one external identifier for idempotency)

### B. Validation and normalization
- Reuse/centralize reader ID normalization.
- Enforce strict canonical final regex: `^AAA\d{9}$`.
- Return friendly 400 for invalid card format.

### C. Idempotency (must-have)
- Prevent duplicate credit for same provider transaction.
- Add idempotency key storage strategy, for example:
  - unique index on `PaymentTransaction.meta.providerTxId`, or
  - separate `PaymentWebhookLog` collection.
- Repeated callback with same payment id must return success without double increment.

### D. Ledger + balance update
- On success:
  - upsert/create `PaymentAccount` for normalized `userNo`
  - increment balance by amount
  - insert `PaymentTransaction`:
    - `type: "top_up"`
    - `direction: "in"`
    - `source`: add `"payme"` to enum (recommended) OR map via comment/meta if enum change not allowed
    - store provider identifiers in comment/meta

### E. "Xodim = Payme" display rule
- Current `createdBy` is ObjectId ref to `User`, so you must choose one robust approach:
  1. **Recommended:** create/find a system user with nickname `Payme` and set `createdBy` to that user id.
  2. Alternative: keep `createdBy: null` and update UI mapping to show `Payme` when `source === "payme"`.
- Ensure all relevant UIs (balances history, payment history, statistics detail table) show `Payme` consistently.

### F. Member existence behavior
- For payment account: if missing, auto-create (required).
- If there is no member in Nazorat cache (`cache` collection), do **not** block top-up; keep account and transaction anyway.
- Optionally set placeholder metadata for unknown member state.

### G. Styling/UI validation for ID card fields
- Wherever user enters ID card for top-up/search, add immediate UX hints:
  - auto uppercase
  - normalize 9-digit to AAA-prefixed on blur
  - invalid state styling when not matching `^AAA\d{9}$`
  - short helper text: `Format: AAA123456789 yoki 123456789`

---

## 4) Non-functional requirements

- Keep existing permission model unchanged for internal pages.
- Do not break current manual top-up/spend/service-provision flows.
- Keep response/error style consistent with existing Uzbek error messages.
- Add/update tests:
  - valid normalization cases
  - invalid userNo rejection
  - creates account when missing
  - idempotent repeated callback
  - creates transaction with initiator displayed as `Payme`

---

## 5) Acceptance criteria checklist

- [ ] Online top-up endpoint exists and is secured for provider calls.
- [ ] `userNo` validation enforces canonical `AAA + 9 digits`.
- [ ] Missing payment account is auto-created.
- [ ] Balance increases exactly once per provider payment id.
- [ ] Transaction row is written with `type=top_up`, `direction=in`, and provider trace fields.
- [ ] Initiator shown as `Payme` in UI transaction views.
- [ ] Existing payment features continue to work.
- [ ] Tests cover happy path + duplicate callback + invalid format.

---

## 6) Notes for implementer

- This project already has optional transaction fallback (`runWithOptionalTransaction`) for standalone Mongo (`code 20`), reuse that pattern.
- Transactions listing already populates `createdBy`, so UI side is ready if you attach a real `Payme` user id.
- Keep data compatibility with historical rows and existing statistics aggregations.
