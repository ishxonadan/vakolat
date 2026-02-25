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
