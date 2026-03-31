# Project snapshot (technical memory)

**Diss (dissertations)** — DB: yoqlama (diss). Documents, razdel (document type + legacy category; schema `collection: 'razdel'`) and razdels (Kategoriya; schema `collection: 'razdels'`), Level, Language, Field (soha). Pagination: `/diss_list/:page?` + `?search=`, returns `{ results, total }`; backend `.limit()`/`.skip()`, search `$or` on code/title/author with `escapeRegex()`. Frontend lazy DataTable, server-side search debounced. Turi: hardcoded options "Dissertatsiya" / "Avtoreferat" (mirrors `razdel` seeds). Kategoriya: load from `/api/diss/razdels`; `categories` built from `{ name, razdel_id }` docs into `{ label, value }`. Edit/add: `category_id` normalized `Number()` for dropdown; language resolved by code or `aliases[]` from API; invalid language (not in Tillar) → red border + label "(ro'yxatda yo'q)", `validLanguageCodes` ref + `invalidLanguage` computed.

**Razdel / Razdels — DO NOT BREAK.** `razdel` (model Razdel) and `razdels` (model Razdels) live in yoqlama. `razdel` documents **must** have `name` (String) and `razdel_id` (Number); seed when empty (e.g. Dissertatsiya razdel_id 1, Avtoreferat razdel_id 2). API `/api/diss/cats` uses `razdel` for legacy type/category lookups (kept for compatibility). `razdels` is the **authoritative source for Kategoriya**: `/api/diss/razdels` returns only docs with both `name` and `razdel_id`, sorted by `razdel_id`, normalized to `{ name, razdel_id }`. Frontend (diss_add, diss_edit): Turi dropdown is static (Dissertatsiya / Avtoreferat) matching `razdel` seeds; Kategoriya dropdown uses `/api/diss/razdels` → `{ label: name, value: Number(razdel_id) }`. Do not change field names or drop the filter/normalization or Kategoriya breaks. **Naming rule:** `razdel` → Turi (document type); `razdels` → Kategoriya.

**Tillar** — Language schema: `name`, `code`, `aliases[]`, `isActive`. Seed canonical codes uz/ru/en with aliases uzb/rus/eng (legacy codes as aliases); migration from old uzb/rus/eng to uz/ru/en on existing DBs; all seeded languages enabled. CRUD `/diss/languages`. Admin diss_languages.vue: aliases comma-sep. Add/edit use only `isActive === true`. Document default language `uz`.

**Soha** — Field schema `code`, `name`, `collection: 'fields'`. Seed once from `content/soha.json` when empty. CRUD `/diss/fields`. Admin diss_soha.vue. Add/edit: Dropdown from `/diss/fields`, label `code - name`; `appendTo="self"`; panel CSS `left:0`, `max-width: min(100%, calc(100vw - 2rem))`, trigger shrink when open `:has(.p-dropdown-panel)`; items wrapper `overflow-x: auto`. Legacy soha_kodi: if doc value not in options, push option so selection shows.

**File replace (edit)** — Upload dir: `uploadsDir = path.resolve(process.cwd(), "uploads")`; multer and copy both use it. `diss_save/:uuid`: copy from `uploadFolder` using `path.basename(originalUploadedFilename)`; 400 if source missing. Frontend: show `result.error`/`result.details` in toast on save failure.

**Akademik daraja (levels)** — Level schema: name, mark (unique), isActive. Seed when empty: nomzod, doktor, doktor_fan. CRUD GET/POST/PUT/DELETE `/diss/levels`. Admin page `/diss/akademik-daraja` (diss_akademik_daraja.vue). Add/edit use levelOptions from API (diss add/edit already use GET /diss/levels).

**Routes/menu** — Dissertatsiya: Hujjatlar, Tillar (`/diss/languages`), Soha (`/diss/soha`), Akademik daraja (`/diss/akademik-daraja`), To'liq matnga ruxsat. Each menu item guarded by its specific permission (see Huquqlar).

**Huquqlar (permissions)** — Permission model: `name`, `description`, `isActive`. PermissionGroup model: `name`, `description`, `permissions[]` (ObjectId refs), `isActive`. User has `permissionGroup` (single group). Access chain: User → permissionGroup → permissions[].name. `rais` level bypasses all checks. Middleware: `checkPermissions(names[])` in `src/middleware/auth.middleware.js` — traverses the chain, requires ALL listed names. `verifyToken` for read-only routes.

Named permissions (seeded on startup, upsert-safe):
- `view_dissertations` — list/view diss
- `add_dissertation` — POST /api/diss_save
- `edit_dissertation` — POST /api/diss_save/:uuid (incl. hide/unhide)
- `delete_dissertation` — toggle is_deleted UI guard
- `download_dissertation` — GET /api/diss_file/:uuid
- `manage_diss_languages` — CRUD /api/diss/languages POST/PUT/DELETE
- `manage_diss_levels` — CRUD /api/diss/levels POST/PUT/DELETE
- `manage_diss_fields` — CRUD /api/diss/fields POST/PUT/DELETE
- `manage_diss_categories` — razdel management
- `manage_ip_access` — IP access page
- `view_statistics` — tashriflar
- `view_members` — a'zo bo'lganlar
- `manage_users` — vakillar
- `view_tickets` — bir martalik chiptalar ro'yxatini ko'rish
- `create_tickets` — bir martalik chiptalar yaratish/o'chirish
- `manage_permissions` — huquqlar page

Default groups seeded: "Admin" (all), "Dissertatsiya mutaxassisi" (view+add+edit+download+stats), "Kuzatuvchi" (view only). Login returns `permissions` array (names). Auth headers: all diss API calls use `apiFetch` from `src/utils/api.js` which injects `Authorization: Bearer <token>`.

**Impersonation (superuser → vakil → back)** — Admin can "enter" a vakil via `/api/admin/login-as-expert`. Backend (`routes/admin.routes.js`) must: find the expert, populate `permissionGroup.permissions`, and return `{ token, user, permissions[] }` where `permissions` is the expert's active permission names. Frontend (`vakillar.vue`) must, before switching, save current session to `originalUser = { token, user, permissions }` and set `isImpersonating = 'true'`, then replace `token`, `user` and `permissions` with the expert's values and reload `/`. Topbar (`AppTopbar.vue`) must detect impersonation from localStorage and `originalUser`, and "Return to admin" must restore `token`, `user` and `permissions` from `originalUser`, clear impersonation flags, and redirect to `/vakillar`. This guarantees the menu and access rights match the active (real or impersonated) user.

**Vakillar audit & statistics** — All authenticated `/api/**` calls (except auth + a few noisy endpoints) for non‑`rais` users are written to `AuditLog` with `user`, `action`, `entityType`, `entityId`, and `meta` (method, path, query, body, status, duration). Important actions are normalized: dissertations (`add_dissertation`, `edit_dissertation`, `disable_dissertation`, `enable_dissertation`, `view_dissertation_list`, `view_dissertation_detail`), registration (`register_user`, `edit_expert`), one‑day tickets (`add_ticket`, `view_tickets`). Superuser can read logs via `/api/admin/audit-logs` and aggregated per‑vakil stats via `/api/admin/audit-stats`. UI: `vakil_logs.vue` has two tabs — **Loglar** (human‑readable actions in Uzbek) and **Statistikalar** with three sections (Registratsiya, Bir martalik chipta, Dissertatsiya), each listing only vakillar involved in that domain; clicking a vakil jumps back to their detailed logs.

**Vakillar page** — `vakillar.vue` lists experts with columns: Login, Ismi sharif, Lavozimi, Huquq guruhi (Tag with group name), Holat (green lock-open / red lock icon toggle using `isActive` and PUT `/api/experts/:id`), and Amallar. Amallar has three color‑coded icon buttons: Edit (info), View logs (warning, opens `vakil_logs` with `userId`), and "Vakil sifatida kirish" (success, superadmin‑only impersonation via `/api/admin/login-as-expert`). Actions are compact, rounded buttons with larger icons; Holat/Amallar gap is reduced via table cell padding tweaks.

**One‑day tickets permissions** — Tickets API (`/api/tickets/**`) is guarded by named permissions instead of level: viewing endpoints (`GET /api/tickets`, `/api/tickets/:id`, `/api/tickets/user/:passport`, `/api/tickets/:id/qr`, `/api/tickets/count/:passport`) require `view_tickets`; mutating endpoints (`POST /api/tickets`, `DELETE /api/tickets/:id`) require `create_tickets`. Menu item "Bir martalik chipta" uses `requiredPermissions: ['view_tickets']`. Tickets UI (`tickets.vue`) shows "Yangi chipta" button only when `authService.hasPermission('create_tickets')` is true.

**User password change (Settings)** — New `/settings` route and menu section "Sozlamalar → Parolni o'zgartirish" for any authenticated user. Backend endpoint `POST /api/auth/change-password` (with `verifyToken`) expects `{ currentPassword, newPassword }`, checks current password with bcrypt, enforces only a minimal rule (new password length ≥ 6), hashes and saves. Frontend form (`settings.vue`) is simple: three fields (current, new, confirm), light validations, success/error toasts; "password changer shouldn't be too strict" is captured by the minimal length rule and no complexity requirements.

**Dissertation approved date (legacy format)** — `approved_date` field in `Documents` schema is `Date`, but older records may store `"dd.MM.yyyy"` strings (e.g. `"17.04.2003"`). `diss_edit.vue` normalizes on load: if `approved_date` is a string matching `dd.MM.yyyy`, it is parsed into a real `Date(year, monthIndex, day)` before passing to PrimeVue `Calendar` (`dateFormat="dd.mm.yy"`); otherwise falls back to `new Date(...)` with NaN guard. On save, `approved_date` is sent as the bound Date so Mongoose stores a real Date, and the UI always shows the correct approved date.

**Pullik xizmatlar / Payment system** — New payment/accounting subsystem in current `vakolat` DB. Core models in `server.js` (connection `vakolat`):

- `PaymentAccount` — `{ userNo: String, balance: Number, status: 'active'|..., meta: Mixed }`, unique by `userNo`. Represents cached balance for library users (ID karta raqami; aligns with `ReaderID` from old `/pullik` after normalization to `AAA#########`).
- `PaymentTransaction` — per-movement log: `{ userNo, type: 'top_up'|'spend'|'adjustment'|'migration', direction: 'in'|'out', amount, serviceId?, departmentId?, source: 'manual'|'service'|'migration', comment, createdBy }` with index `{ userNo: 1, createdAt: -1 }`. **Authoritative source** for recomputing balances; `balance` can be fully recalculated from this table.
- `PaymentService` — catalog of paid services: `{ name, code?, price, isActive }`.
- `PaymentDepartment` — departments for grouping vakils: `{ name, code?, isActive }`.
- `UserDepartment` — mapping vakil → department: `{ expertId: ObjectId(User), departmentId: ObjectId(PaymentDepartment), isActive }` with unique index on `{ expertId, departmentId }`.
- `PaymentServiceProvision` — grouped “service provision” operation: `{ userNo, items[{ serviceId, serviceName, quantity, unitPrice, totalPrice }], totalAmount, comment, status: 'active'|'cancelled', providedBy, cancelledBy?, cancelledReason?, cancelledAt? }`. Used to withdraw money per service and optionally refund on cancellation.

All models are registered on `vakolat` and exposed via `app.locals` (`PaymentAccount`, `PaymentTransaction`, `PaymentService`, `PaymentDepartment`, `UserDepartment`, `PaymentServiceProvision`) for reuse in routes and audit.

**Payment permissions (Huquqlar)** — Added to `ALL_PERMISSIONS` seed (upsert-safe):

- `payment_topup_user` — may top up a user's balance.
- `payment_withdraw_user` — may manually withdraw from user balance (general spend).
- `payment_manage_services` — CRUD on `PaymentService`.
- `payment_manage_departments` — CRUD on `PaymentDepartment`.
- `payment_manage_user_departments` — assign/remove vakil ↔ department.
- `payment_provide_service` — perform service-based withdrawals (xizmat ko'rsatish).
- `payment_cancel_provided_service` — cancel a service provision and refund the amount.

These are available on the Huquqlar page (`huquqlar.vue`) and usable in permission groups like any other named permission.

**Payment routes / APIs** — Implemented in `[routes/members-payment.routes.js]` and mounted under `/api/members/payment`:

- Accounts & balances:
  - `GET /api/members/payment/accounts` — paginated list of `PaymentAccount` with optional search on Nazorat `cache` collection (`USER_NO` or `USER_NAME`). Default sort: `balance` desc. On **first call**, a one-time cache job recomputes balances from all `PaymentTransaction` rows and writes into `PaymentAccount`. When `search` is used, matching `userNo`s are *recalculated on demand* before listing to ensure fresh balances.
  - `GET /api/members/payment/accounts/overview` — aggregate stats for balances page header:
    - `overallMoneyInBalances` (sum of all `PaymentAccount.balance`)
    - `overallSpending` (sum of all outgoing transactions)
    - `spendingThisMonth` (outgoing since month start)
    - `spendingThisYear` (outgoing since Jan 1)
  - `GET /api/members/payment/accounts/:userNo` — recalculates that user's balance from `PaymentTransaction` and returns `{ account, member }`. Used by UI for live leverage and user header info.
- Manual money movements:
  - `POST /api/members/payment/topup` — guarded by `payment_topup_user`. Creates/updates `PaymentAccount` (create-if-missing, `status: 'active'`), increments `balance` by `amount`, and writes a `PaymentTransaction` (`type: 'top_up'`, `direction: 'in'`, `source: 'manual'`, `createdBy` = vakil). Used by Foydalanuvchi balansi “To'ldirish” button.
  - `POST /api/members/payment/spend` — guarded by `payment_withdraw_user`. Ensures account exists (create with `balance = 0` if missing), enforces non-negative balance, decrements `balance`, and writes a `PaymentTransaction` (`type: 'spend'`, `direction: 'out'`, `source: 'manual'`).
- Transactions listing:
  - `GET /api/members/payment/transactions` — list/filter `PaymentTransaction` with `userNo`, `type`, `serviceId`, `departmentId`, and `from`/`to` date range. Used by history views and per-user “Tarix” dialog.
- Services & departments:
  - `GET /api/members/payment/services` — list of all services (front-end filters only active ones).
  - `POST/PUT/DELETE /api/members/payment/services` — guarded by `payment_manage_services`. CRUD on `PaymentService`.
  - `GET /api/members/payment/departments` — list of departments.
  - `POST/PUT/DELETE /api/members/payment/departments` — guarded by `payment_manage_departments`. Deletion also removes corresponding `UserDepartment` mappings.
- Vakil departments:
  - `GET /api/members/payment/experts` — list vakils (`User` with `level: 'expert'`) with basic fields; supports department assignment UI.
  - `GET /api/members/payment/user-departments` — list mappings; can filter by `expertId`. Returns objects populated with `expertId` and `departmentId`.
  - `POST /api/members/payment/user-departments` — guarded by `payment_manage_user_departments`. Upsert mapping `{ expertId, departmentId }`.
  - `DELETE /api/members/payment/user-departments` — guarded by same permission. Removes mapping `{ expertId, departmentId }`.
- Service provisions (xizmat ko'rsatish):
  - `GET /api/members/payment/service-provisions` — list grouped service provisions, filterable by `userNo` and `status`. Populates `providedBy`, `cancelledBy`, and linked services.
  - `POST /api/members/payment/service-provisions` — guarded by `payment_provide_service`. Body `{ userNo, items[{ serviceId, quantity }], comment }`. Workflow:
    - Validates each service is active and quantity > 0.
    - Computes per-item `unitPrice` from `PaymentService.price`, `totalPrice = unitPrice * quantity`, and aggregated `totalAmount`.
    - Recomputes/ensures `PaymentAccount` for `userNo` (create if missing), checks balance >= `totalAmount`, debits account, writes one `PaymentServiceProvision` with expanded `items`, and writes one or more `PaymentTransaction` rows (`type: 'spend'`, `direction: 'out'`, `source: 'service'`) — one per service line.
  - `POST /api/members/payment/service-provisions/:id/cancel` — guarded by `payment_cancel_provided_service`. Idempotent-ish:
    - If provision not found → 404.
    - If already cancelled → 400.
    - Otherwise credits back `totalAmount` to user balance via `PaymentAccount.updateOne(... $inc: { balance: totalAmount })` and a compensating `PaymentTransaction` (`type: 'adjustment'`, `direction: 'in'`, `source: 'service'`).
    - Marks provision `status: 'cancelled'`, sets `cancelledBy`, `cancelledReason`, `cancelledAt`.

**Mongo standalone compatibility (important)** — Payment write endpoints now support both replica set and standalone MongoDB. Route logic first attempts transaction flow, and if Mongo returns `IllegalOperation` code `20` (`Transaction numbers are only allowed on a replica set member or mongos`), it automatically falls back to non-transaction writes. Applied to:
- `POST /api/members/payment/topup`
- `POST /api/members/payment/spend`
- `POST /api/members/payment/service-provisions`
- `POST /api/members/payment/service-provisions/:id/cancel`

**Payment UI / menu** — Payment UI lives in its own top-level `Pullik xizmatlar` menu plus `Vakillar boshqaruvi` for department assignment:

- Menu (`AppMenu.vue`):
  - Top-level `Pullik xizmatlar`:
    - `Tarix` → `/payment/history` (requires `payment_topup_user`).
    - `Foydalanuvchi balansi` → `/payment/balances` (requires `payment_topup_user`).
    - `Xizmatlar` → `/payment/services` (requires `payment_manage_services`).
    - `Xizmat ko'rsatish` → `/payment/service-provision` (requires `payment_provide_service`).
  - Under `Vakillar boshqaruvi`:
    - `Bo'limlar va tegishli foydalanuvchilar` → `/payment/departments` (requires `payment_manage_user_departments`).

Routes (`src/router/index.js`) map these to:

- `/payment/history` → `payment_history.vue`.
- `/payment/balances` → `payment_balances.vue`.
- `/payment/services` → `payment_services.vue`.
- `/payment/departments` → `payment_departments.vue`.
- `/payment/service-provision` → `payment_service_provision.vue`.

Key UI behaviors:

- `payment_balances.vue` — shows only users that have a `PaymentAccount` row (i.e. real participants), sorted by `balance` desc by default. Search is via Nazorat `cache` (`USER_NO`/`USER_NAME`) and on first load triggers a one-time full balance cache build. When searching specific IDs, their balances are immediately recalculated from `PaymentTransaction`. Per-row actions:
  - Top summary cards (horizontal) show exactly: `Balanslarda pul`, `Umumiy xarajat`, `Shu oy xarajat`, `Yillik xarajat`.
  - Top cards render amounts as integer `so'm` (no tiyin/decimal display).
  - `To'ldirish` / `Yechish` buttons use `/topup` and `/spend`.
  - `Tarix` button opens a dialog with that user's balance history (both top-ups and spendings from `PaymentTransaction`, latest first). The dialog includes `Tur` tag (`To'ldirish`/`Yechish`).
  - History comments are shown in Uzbek; legacy English migration comments are normalized on display (`Migrated ...` -> `(mig) ...`).
  - Quick top-up/withdraw panel at the top allows specifying ID card number directly even if no account row exists yet (account is created lazily).
- `payment_history.vue` — global payment transaction history list with filters (user, type); mostly for admins.
- `payment_services.vue` — CRUD UI for `PaymentService` (name, code, price, active).
- `payment_departments.vue` — two-pane view:
  - Left: departments CRUD.
  - Right: vakil ↔ department assignments, selecting vakil from `/experts` and department from left-hand list.
- `payment_service_provision.vue` — main **Xizmat ko'rsatish** screen:
  - Top: user lookup by ID card number, showing current balance and predicted remaining balance given selected services.
  - Middle: dynamic list of service lines (service dropdown, quantity, per-line cost) plus overall total.
  - Bottom: comment and “Xizmatni rasmiylashtirish” button (guarded by `payment_provide_service`, disabled when balance insufficient).
  - Below: table with past provisions for that user, with status, items, amounts, and “Bekor qilish” button (if `payment_cancel_provided_service` is granted).

**Pullik migration script notes (`scripts/migrate-pullik.js`)**
- Script flags:
  - default run = dry-run
  - `--write` = persist
  - `--show-collections` = print source collection names
  - `--reset-migration` = delete existing `source: 'migration'` transactions before import, then rebuild account balances
- Performance:
  - Uses cursor streaming (`batchSize`) instead of loading full collections into memory.
  - Uses batched `bulkWrite` for transaction inserts and aggregated per-user balance deltas.
  - Tunables: `PULLIK_MIGRATE_BATCH_SIZE`, `PULLIK_MIGRATE_CURSOR_BATCH_SIZE`.
- Correctness:
  - Reader IDs normalized to `AAA#########` (uppercase canonical form).
  - Prevents duplicate top-up counting: when top-up collection exists, inbound movement rows are skipped.
  - Legacy movement direction classification supports numeric `Direction` (`>0` in, `0/<0` out) plus text/sign fallbacks.
  - Movement timestamp mapping includes legacy `Moment` field (not only `Date/CreatedAt`) so month/year stats are accurate.
  - After write runs, account balances are always rebuilt from `PaymentTransaction` ledger.
- Migration comment style:
  - Uses Uzbek `(mig)` prefix (e.g. `(mig) Hisob to'ldirildi`, `(mig) Xizmat uchun yechish (...)`).
  - For migrated spend rows, comments include human-readable service and department context when available.
