# Project snapshot (technical memory)

**Package:** `vakolat` — app version label in sidebar/footer reads `Talqin v<package.json#version>` (e.g. `2026.4.1`). This file is a living map of brittle/important behavior; update it when changing permissions, payment flows, or diss razdel/razdels contracts.

**Diss (dissertations)** — DB: yoqlama (diss). Documents, razdel (document type + legacy category; schema `collection: 'razdel'`) and razdels (Kategoriya; schema `collection: 'razdels'`), Level, Language, Field (soha). Pagination: `/diss_list/:page?` + `?search=`, returns `{ results, total }`; backend `.limit()`/`.skip()`, search `$or` on code/title/author with `escapeRegex()`. Frontend lazy DataTable, server-side search debounced. Turi: hardcoded options "Dissertatsiya" / "Avtoreferat" (mirrors `razdel` seeds). Kategoriya: load from `/api/diss/razdels`; `categories` built from `{ name, razdel_id }` docs into `{ label, value }`. Edit/add: `category_id` normalized `Number()` for dropdown; language resolved by code or `aliases[]` from API; invalid language (not in Tillar) → red border + label "(ro'yxatda yo'q)", `validLanguageCodes` ref + `invalidLanguage` computed.

**Razdel / Razdels — DO NOT BREAK.** `razdel` (model Razdel) and `razdels` (model Razdels) live in yoqlama. `razdel` documents **must** have `name` (String) and `razdel_id` (Number); seed when empty (e.g. Dissertatsiya razdel_id 1, Avtoreferat razdel_id 2). API `/api/diss/cats` uses `razdel` for legacy type/category lookups (kept for compatibility). `razdels` is the **authoritative source for Kategoriya**: `/api/diss/razdels` returns only docs with both `name` and `razdel_id`, sorted by `razdel_id`, normalized to `{ name, razdel_id }`. Frontend (diss_add, diss_edit): Turi dropdown is static (Dissertatsiya / Avtoreferat) matching `razdel` seeds; Kategoriya dropdown uses `/api/diss/razdels` → `{ label: name, value: Number(razdel_id) }`. Do not change field names or drop the filter/normalization or Kategoriya breaks. **Naming rule:** `razdel` → Turi (document type); `razdels` → Kategoriya.

**Tillar** — Language schema: `name`, `code`, `aliases[]`, `isActive`. Seed canonical codes uz/ru/en with aliases uzb/rus/eng (legacy codes as aliases); migration from old uzb/rus/eng to uz/ru/en on existing DBs; all seeded languages enabled. CRUD `/diss/languages`. Admin diss_languages.vue: aliases comma-sep. Add/edit use only `isActive === true`. Document default language `uz`.

**Soha** — Field schema `code`, `name`, `collection: 'fields'`. Seed once from `content/soha.json` when empty. CRUD `/diss/fields`. Admin diss_soha.vue. Add/edit: Dropdown from `/diss/fields`, label `code - name`; `appendTo="self"`; panel CSS `left:0`, `max-width: min(100%, calc(100vw - 2rem))`, trigger shrink when open `:has(.p-dropdown-panel)`; items wrapper `overflow-x: auto`. Legacy soha_kodi: if doc value not in options, push option so selection shows.

**File replace (edit)** — Upload dir: `uploadsDir = path.resolve(process.cwd(), "uploads")`; multer and copy both use it. `diss_save/:uuid`: copy from `uploadFolder` using `path.basename(originalUploadedFilename)`; 400 if source missing. Frontend: show `result.error`/`result.details` in toast on save failure.

**Akademik daraja (levels)** — Level schema: name, mark (unique), isActive. Seed when empty: nomzod, doktor, doktor_fan. CRUD GET/POST/PUT/DELETE `/diss/levels`. Admin page `/diss/akademik-daraja` (diss_akademik_daraja.vue). Add/edit use levelOptions from API (diss add/edit already use GET /diss/levels).

**Routes/menu** — Dissertatsiya: Hujjatlar, Tillar (`/diss/languages`), Soha (`/diss/soha`), Akademik daraja (`/diss/akademik-daraja`), To'liq matnga ruxsat. Each menu item guarded by its specific permission (see Huquqlar).

**Huquqlar (permissions)** — Permission model: `name`, `description`, `isActive`. PermissionGroup model: `name`, `description`, `permissions[]` (ObjectId refs), `isActive`. User has `permissionGroup` (single group). Access chain: User → permissionGroup → permissions[].name. `rais` level bypasses all checks. Middleware (`src/middleware/auth.middleware.js`): **`checkPermissions(names[])`** — requires **ALL** listed names; **`checkAnyPermissions(names[])`** — requires **at least one**. `verifyToken` attaches user for read/mutate routes as appropriate.

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
- `manage_users` — xodimlar
- `view_tickets` — bir martalik chiptalar ro'yxatini ko'rish
- `create_tickets` — bir martalik chiptalar yaratish/o'chirish
- `manage_permissions` — huquqlar page

Default groups seeded: "Admin" (all), "Dissertatsiya mutaxassisi" (view+add+edit+download+stats), "Kuzatuvchi" (view only). Login returns `permissions` array (names). Auth headers: all diss API calls use `apiFetch` from `src/utils/api.js` which injects `Authorization: Bearer <token>`.

**Impersonation (superuser → xodim → back)** — Admin can "enter" a xodim via `/api/admin/login-as-expert`. Backend (`routes/admin.routes.js`) must: find the expert, populate `permissionGroup.permissions`, and return `{ token, user, permissions[] }` where `permissions` is the expert's active permission names. Frontend (`xodimlar.vue`) must, before switching, save current session to `originalUser = { token, user, permissions }` and set `isImpersonating = 'true'`, then replace `token`, `user` and `permissions` with the expert's values and reload `/`. Topbar (`AppTopbar.vue`) must detect impersonation from localStorage and `originalUser`, and "Return to admin" must restore `token`, `user` and `permissions` from `originalUser`, clear impersonation flags, and redirect to `/xodimlar`. This guarantees the menu and access rights match the active (real or impersonated) user.

**Xodimlar audit & statistics** — Non‑`rais` users: most authenticated `/api/**` traffic is logged to `AuditLog` (`user`, `action`, `entityType`, `entityId`, `meta`). Normalized actions include dissertations, registration, tickets, and **pullik** bundles (`payment_topup`, `payment_spend`, `payment_service_provide`, `payment_service_cancel`, service/department CRUD, read-only payment views such as `payment_view_transactions` / `payment_read_account`, etc.—see `routes/audit.routes.js` aggregations). Superuser: `/api/admin/audit-logs`, `/api/admin/audit-stats`. **UI** `xodim_logs.vue`: **Loglar** + **Statistikalar** — jadval ketma-ketligi: **Registratsiya**, **Bir martalik chipta**, **Pullik xizmatlar** (ustunlar: to‘ldirish, yechish, xizmat ko‘rsatish, bekor, xizmat CRUD, zal, biriktirish, jami), **Dissertatsiya**. Audit ilovada **`rais`** uchun umumiy API shovqini o‘tkazib yuboriladi, lekin **`/api/members/payment`** (va chipta / ma’lum registratsiya yo‘llari) **yoziladi**, shuning uchun pullik statistikasida rais ham chiqishi mumkin.

**Xodimlar page** — `xodimlar.vue` lists experts with columns: Login, Ismi sharif, Lavozimi, Huquq guruhi (Tag with group name), Holat (green lock-open / red lock icon toggle using `isActive` and PUT `/api/experts/:id`), and Amallar. Amallar has three color‑coded icon buttons: Edit (info), View logs (warning, opens `xodim_logs` with `userId`), and "Xodim sifatida kirish" (success, superadmin‑only impersonation via `/api/admin/login-as-expert`). Actions are compact, rounded buttons with larger icons; Holat/Amallar gap is reduced via table cell padding tweaks.

**One‑day tickets permissions** — Tickets API (`/api/tickets/**`) is guarded by named permissions instead of level: viewing endpoints (`GET /api/tickets`, `/api/tickets/:id`, `/api/tickets/user/:passport`, `/api/tickets/:id/qr`, `/api/tickets/count/:passport`) require `view_tickets`; mutating endpoints (`POST /api/tickets`, `DELETE /api/tickets/:id`) require `create_tickets`. Menu item "Bir martalik chipta" uses `requiredPermissions: ['view_tickets']`. Tickets UI (`tickets.vue`) shows "Yangi chipta" button only when `authService.hasPermission('create_tickets')` is true.

**User password change (Settings)** — New `/settings` route and menu section "Sozlamalar → Parolni o'zgartirish" for any authenticated user. Backend endpoint `POST /api/auth/change-password` (with `verifyToken`) expects `{ currentPassword, newPassword }`, checks current password with bcrypt, enforces only a minimal rule (new password length ≥ 6), hashes and saves. Frontend form (`settings.vue`) is simple: three fields (current, new, confirm), light validations, success/error toasts; "password changer shouldn't be too strict" is captured by the minimal length rule and no complexity requirements.

**Dissertation approved date (legacy format)** — `approved_date` field in `Documents` schema is `Date`, but older records may store `"dd.MM.yyyy"` strings (e.g. `"17.04.2003"`). `diss_edit.vue` normalizes on load: if `approved_date` is a string matching `dd.MM.yyyy`, it is parsed into a real `Date(year, monthIndex, day)` before passing to PrimeVue `Calendar` (`dateFormat="dd.mm.yy"`); otherwise falls back to `new Date(...)` with NaN guard. On save, `approved_date` is sent as the bound Date so Mongoose stores a real Date, and the UI always shows the correct approved date.

**Pullik xizmatlar / Payment system** — New payment/accounting subsystem in current `vakolat` DB. Core models in `server.js` (connection `vakolat`):

- `PaymentAccount` — `{ userNo: String, balance: Number, status: 'active'|..., meta: Mixed }`, unique by `userNo`. Represents cached balance for library users (ID karta raqami; aligns with `ReaderID` from old `/pullik` after normalization to `AAA#########`).
- `PaymentTransaction` — per-movement log: `{ userNo, type: 'top_up'|'spend'|'adjustment'|'migration', direction: 'in'|'out', amount, serviceId?, departmentId?, source: 'manual'|'service'|'migration', comment, createdBy }` with index `{ userNo: 1, createdAt: -1 }`. **Authoritative source** for recomputing balances; `balance` can be fully recalculated from this table.
- `PaymentTransaction` now also stores **`serviceName` snapshot** for safety when service catalog IDs/names change. History API returns `serviceName` with fallback from populate (`serviceId.name || serviceName`) so old rows keep labels after catalog replacement.
- `PaymentService` — catalog of paid services: `{ name, code?, price, isActive }`.
- `PaymentDepartment` — departments for grouping xodims: `{ name, code?, isActive }`.
- `UserDepartment` — mapping xodim → department: `{ expertId: ObjectId(User), departmentId: ObjectId(PaymentDepartment), isActive }` with unique index on `{ expertId, departmentId }`.
- `PaymentServiceProvision` — grouped “service provision” operation: `{ userNo, departmentId?, items[{ serviceId, serviceName, quantity, unitPrice, totalPrice }], totalAmount, comment, status: 'active'|'cancelled', providedBy, cancelledBy?, cancelledReason?, cancelledAt? }`. Used to withdraw money per service and optionally refund on cancellation. Optional **`departmentId`** (Zal / `PaymentDepartment`) is stored when the client sends it and may be **required at runtime** when `SystemSettings.paymentRequireZalForServiceProvision` is true (see below).
- `SystemSettings` — singleton-style doc (first row): **`paymentRequireZalForServiceProvision`** (boolean, default false). Loaded via `/api/system/settings`; **Tizim boshqaruvi** UI (`SystemControlPage.vue`) can toggle it. When true, **POST /service-provisions** rejects missing/invalid zal; service-provision page loads the flag and marks the zal dropdown invalid until selected.

Payment-related models are on `vakolat` and exposed via `app.locals` (`PaymentAccount`, `PaymentTransaction`, `PaymentService`, `PaymentDepartment`, `UserDepartment`, `PaymentServiceProvision`). **`SystemSettings`** is the same DB connection but is **not** on `app.locals`; routes use `vakolat.model("SystemSettings")` (or local `require` scope) where needed.

**Payment permissions (Huquqlar)** — Seeded in `ALL_PERMISSIONS` (upsert-safe); descriptions in Uzbek in `server.js`:

- `payment_topup_user` — balance top-up (manual).
- `payment_withdraw_user` — manual withdraw from balance.
- `payment_list_accounts` — accounts list + search (balances table).
- `payment_read_account` — read one account by `userNo` (combined with other any-of on GET `/accounts/:userNo`).
- `payment_view_transactions` — transaction history (global + per-user).
- `payment_view_overview_stats` — overview aggregates for balances header cards (`/accounts/overview`).
- `payment_manage_services` — CRUD `PaymentService`.
- `payment_manage_departments` — CRUD **Zallar** (`PaymentDepartment`).
- `payment_manage_user_departments` — xodim ↔ zal mapping (`UserDepartment` APIs used from departments UI).
- `payment_provide_service` — xizmat ko'rsatish (debit + provision row).
- `payment_cancel_provided_service` — cancel provision + refund.

Assign via **Huquqlar** (`huquqlar.vue`) like any other named permission.

**Frontend auth helpers** — `auth.service.js`: `hasPermission(name)`, **`hasAnyPermission(names[])`**. Router (`src/router/index.js`) `beforeEach` honors **`meta.permission`** (single) or **`meta.permissionsAny`** (any). `AppMenu.vue` supports **`requiredPermissions`** and **`requiredPermissionsAny`** on items.

**Payment routes / APIs** — `[routes/members-payment.routes.js]` under `/api/members/payment`. Several GETs use **`checkAnyPermissions([...])`** so operators with overlapping roles can open the same data without holding every key.

- Accounts & balances:
  - `GET .../accounts` — **`checkAnyPermissions`:** `payment_list_accounts`, `payment_topup_user`, `payment_withdraw_user`, `payment_view_transactions`, `payment_view_overview_stats`. Paginated `PaymentAccount` list + Nazorat `cache` search (`USER_NO` / `USER_NAME`). Default sort `balance` desc. Cache/bootstrap strategy unchanged (bootstrap when txs exist but no accounts; search recalc for missing users only).
  - `GET .../accounts/overview` — **`checkPermissions(['payment_view_overview_stats'])`**. Header stats: `overallMoneyInBalances`, `overallSpending`, `spendingThisMonth`, `spendingThisYear`.
  - `GET .../accounts/:userNo` — **`checkAnyPermissions`:** `payment_provide_service`, `payment_topup_user`, `payment_withdraw_user`, `payment_list_accounts`, `payment_read_account`. Recalculates balance, returns `{ account, member }` for service-provision / dialogs.
- Manual money movements:
  - `POST /api/members/payment/topup` — guarded by `payment_topup_user`. Creates/updates `PaymentAccount` (create-if-missing, `status: 'active'`), increments `balance` by `amount`, and writes a `PaymentTransaction` (`type: 'top_up'`, `direction: 'in'`, `source: 'manual'`, `createdBy` = xodim). Used by Foydalanuvchi balansi “To'ldirish” button.
  - `POST /api/members/payment/spend` — guarded by `payment_withdraw_user`. Ensures account exists (create with `balance = 0` if missing), enforces non-negative balance, decrements `balance`, and writes a `PaymentTransaction` (`type: 'spend'`, `direction: 'out'`, `source: 'manual'`).
- Transactions listing:
  - `GET /api/members/payment/transactions` — list/filter `PaymentTransaction` with `userNo`, `type`, `serviceId`, `departmentId`, and `from`/`to` date range. Used by history views and per-user “Tarix” dialog.
  - `GET /api/members/payment/statistics` — payment statistics for selected period (`from`, `to`, defaults to `1-yanvar → hozir`): 
    - `dailyTopups[]` grouped by day for `type=top_up`, `direction=in`
    - `userSpending[]` grouped by `userNo` using spend-delta logic (`out` positive, service refund `in` negative), only positive totals returned
    - `summary` totals for both sections. Guarded by `payment_view_transactions`.
- Services & departments:
  - `GET /api/members/payment/services` — list of all services (front-end filters only active ones).
  - `POST/PUT/DELETE /api/members/payment/services` — guarded by `payment_manage_services`. CRUD on `PaymentService`.
  - `GET .../departments` — list departments; **`checkAnyPermissions`:** `payment_provide_service`, `payment_manage_departments` (provision UI needs dropdown; admins manage).
  - `POST/PUT/DELETE .../departments` — **`checkPermissions(['payment_manage_departments'])`**. Delete cascades related `UserDepartment` mappings.
- Xodim departments:
  - `GET /api/members/payment/experts` — list xodims (`User` with `level: 'expert'`) with basic fields; supports department assignment UI.
  - `GET /api/members/payment/user-departments` — list mappings; can filter by `expertId`. Returns objects populated with `expertId` and `departmentId`.
  - `POST /api/members/payment/user-departments` — guarded by `payment_manage_user_departments`. Upsert mapping `{ expertId, departmentId }`.
  - `DELETE /api/members/payment/user-departments` — guarded by same permission. Removes mapping `{ expertId, departmentId }`.
- Service provisions (xizmat ko'rsatish):
  - `GET .../service-provisions` — list grouped provisions (`userNo`, `status` filters); populates `providedBy`, `cancelledBy`, services, **`departmentId`**. **`checkAnyPermissions`:** `payment_provide_service`, `payment_view_transactions`.
  - `POST .../service-provisions` — **`checkPermissions(['payment_provide_service'])`**. Body `{ userNo, items[{ serviceId, quantity }], comment?, departmentId? }`. If system flag requires zal, **`departmentId`** must be a non-empty valid `PaymentDepartment` id. Workflow:
    - Validates each service is active and quantity > 0.
    - Supports special item `serviceId: "__custom_price__"` ("O'zingiz narx qo'ying"): requires positive `customPrice`; stores provision item with `serviceId: null`, `serviceName: "O'zingiz narx qo'ying"`, and writes transaction with `serviceName` snapshot.
    - Computes per-item `unitPrice` from `PaymentService.price`, `totalPrice = unitPrice * quantity`, and aggregated `totalAmount`.
    - Recomputes/ensures `PaymentAccount` for `userNo` (create if missing), checks balance >= `totalAmount`, debits account, writes one `PaymentServiceProvision` with expanded `items`, and writes one or more `PaymentTransaction` rows (`type: 'spend'`, `direction: 'out'`, `source: 'service'`) — one per service line.
  - `POST /api/members/payment/service-provisions/:id/cancel` — guarded by `payment_cancel_provided_service`. Idempotent-ish:
    - If provision not found → 404.
    - If already cancelled → 400.
    - Cancel window for non-`rais`: 24 hours from `createdAt`; after that returns 403 (`Bekor qilish muddati tugagan (24 soat)`).
    - `rais` can cancel anytime (no time limit).
    - Otherwise credits back `totalAmount` to user balance via `PaymentAccount.updateOne(... $inc: { balance: totalAmount })` and a compensating `PaymentTransaction` (`type: 'adjustment'`, `direction: 'in'`, `source: 'service'`).
    - Marks provision `status: 'cancelled'`, sets `cancelledBy`, `cancelledReason`, `cancelledAt`.

**Mongo standalone compatibility (important)** — Payment write endpoints now support both replica set and standalone MongoDB. Route logic first attempts transaction flow, and if Mongo returns `IllegalOperation` code `20` (`Transaction numbers are only allowed on a replica set member or mongos`), it automatically falls back to non-transaction writes. Applied to:
- `POST /api/members/payment/topup`
- `POST /api/members/payment/spend`
- `POST /api/members/payment/service-provisions`
- `POST /api/members/payment/service-provisions/:id/cancel`

**Payment UI / menu** — `Pullik xizmatlar` + **Zallar** under `Xodimlar boshqaruvi`.

- Menu (`AppMenu.vue`):
  - `Pullik xizmatlar`:
    - `Xizmat ko'rsatish` → `/payment/service-provision` — `requiredPermissions: ['payment_provide_service']`.
    - `Foydalanuvchi balansi` → `/payment/balances` — **`requiredPermissionsAny`:** `payment_list_accounts`, `payment_topup_user`, `payment_withdraw_user`, `payment_view_transactions`, `payment_view_overview_stats` (any one opens the menu item).
    - `Xizmatlar` → `/payment/services` — `payment_manage_services`.
    - `Tarix` → `/payment/history` — **`payment_view_transactions`** (not top-up permission).
    - `Statistika` → `/payment/statistics` — **`payment_view_transactions`**.
  - `Xodimlar boshqaruvi` → **Zallar** → `/payment/departments` — **`payment_manage_departments`**. The same page’s xodim–zal mapping APIs still require **`payment_manage_user_departments`**; CRUD zallar uses **`payment_manage_departments`**.
  - Sidebar footer: non-clickable **`Talqin v<package.json#version>`**.

Routes (`src/router/index.js`) meta (enforced in `beforeEach`):

- `/payment/history` → `payment_history.vue` — `meta.permission: 'payment_view_transactions'`.
- `/payment/statistics` → `payment_statistics.vue` — `meta.permission: 'payment_view_transactions'`; period presets: `1-yanvar → hozir` (default), `1-chorak`, `2-chorak`, `1-yanvar → 20-dekabr`, and `custom`.
- `/payment/balances` → `payment_balances.vue` — **`meta.permissionsAny`:** same five names as the menu item (any).
- `/payment/services` → `payment_services.vue` — `payment_manage_services`.
- `/payment/departments` → `payment_departments.vue` — **`payment_manage_departments`** (aligned with Zallar menu).
- `/payment/service-provision` → `payment_service_provision.vue` — `payment_provide_service`.

Key UI behaviors:

- `payment_balances.vue` — account table + quick ID bar; capabilities are **split by permission**: e.g. `To'ldirish` / `Yechish` only with `payment_topup_user` / `payment_withdraw_user`; overview cards only with **`payment_view_overview_stats`**; per-row `Tarix` with **`payment_view_transactions`**; `Xizmat ko'rsatish` with **`payment_provide_service`**. Quick search row uses **`hasAnyPermission`** on `payment_list_accounts`, `payment_topup_user`, `payment_withdraw_user` (stricter than route meta so read-only roles may land without quick bar). Default sort `balance` desc; search via Nazorat `cache`; ID **`InputText`** uses **`autocomplete="off"`** (+ helper attrs) to limit browser history suggestions.
  - Top summary cards: `Balanslarda pul`, `Umumiy xarajat`, `Shu oy xarajat`, `Yillik xarajat` (integer `so'm`).
  - `Xizmat ko'rsatish` navigates to `/payment/service-provision?userNo=...` when permitted.
  - Top-up/withdraw/create account behavior unchanged; history dialog + Uzbek comment normalization unchanged.
- `payment_history.vue` — global `PaymentTransaction` list (filters: user, type); **ID field** also uses `autocomplete="off"` helpers.
- `payment_services.vue` — CRUD UI for `PaymentService` (name, code, price, active) with inline `InputSwitch` to quickly enable/disable a service; disabled services are hidden in `payment_service_provision.vue`. Price column is formatted with `so'm`.
- `payment_departments.vue` — two-pane view:
  - Left: departments CRUD.
  - Right: xodim ↔ department assignments, selecting xodim from `/experts` and department from left-hand list.
- `payment_service_provision.vue` — **Xizmat ko'rsatish**:
  - Toolbar: **Zal** dropdown (`PaymentDepartment`) + **ID karta raqami** (`autocomplete="off"` helpers) + **Foydalanuvchini tanlash**. Loads **`/system/settings`** flag `paymentRequireZalForServiceProvision`; when true, zal required client+server, invalid styling + warn `Message`.
  - Enter / 9-digit normalization / `?userNo=` prefetch unchanged.
  - Balance cards + insufficient-funds messaging unchanged. Service lines grid (`Xizmat`, `Soni`, `Birlik narxi`, `Jami`) + **Yana xizmat qo'shish** outlined control.
  - `Xizmat` dropdown first option is **`O'zingiz narx qo'ying`** (tagged as maxsus). When selected, unit price becomes manual `InputNumber`; total uses `customPrice * quantity`.
  - Submit **Xizmatni rasmiylashtirish**: when all prerequisites pass (`userNo`, balance, zal, lines), one-shot **~1.8s** inner shine + glow animation on the enabled button (`watch` on readiness + CSS `::before`).
  - Past provisions table: non-cancelled status label **`Bajarildi`** (not “Faol”); **`Bekor qilingan`** unchanged; cancel rules (24h / `rais`) unchanged.

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
  - Service prices are recovered from legacy price sources when `dbo_ent_Service` has no direct price field:
    - primary: `dbo_info_ServiceHistory.Price` (latest per service)
    - fallback: inferred from `dbo_doc_GiveServiceTab` (`Total / ServiceCount`)

**Service catalog replacement (`scripts/import-payment-services-2026.js`)**
- Purpose: replace old payment services catalog with approved 2026 list.
- Safety before replace: backfills missing `PaymentTransaction.serviceName` from current `PaymentService` names.
- Run modes:
  - dry-run: `node scripts/import-payment-services-2026.js`
  - write: `node scripts/import-payment-services-2026.js --write`
