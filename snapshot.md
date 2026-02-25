# Project snapshot (technical memory)

**Diss (dissertations)** — DB: yoqlama (diss). Documents, razdel (categories; schema `collection: 'razdel'`), Level, Language, Field (soha). Pagination: `/diss_list/:page?` + `?search=`, returns `{ results, total }`; backend `.limit()`/`.skip()`, search `$or` on code/title/author with `escapeRegex()`. Frontend lazy DataTable, server-side search debounced. Categories: load from `/diss/cats`; use `Promise.allSettled` so one failed request doesn’t leave others empty; `Array.isArray(data)` guard. Edit: level + type (both spellings Dissertatsiya/Dissertatisya in options); `category_id` normalized `Number()` for dropdown; language resolved by code or `aliases[]` from API; invalid language (not in Tillar) → red border + label "(ro'yxatda yo'q)", `validLanguageCodes` ref + `invalidLanguage` computed.

**Razdel (Kategoriya) — DO NOT BREAK.** Collection: `razdel` (model Razdel). Each document **must** have `name` (String) and `razdel_id` (Number); document schema uses `category_id: Number` and must match. Seed when empty (e.g. Dissertatsiya razdel_id 1, Avtoreferat razdel_id 2). API `/api/diss/cats`: call seed, then return only docs with both `name` and `razdel_id`, sorted by `razdel_id`, normalized to `{ name, razdel_id }`. Frontend (diss_add, diss_edit): build category options only from items where `cat.name != null && cat.razdel_id != null`; use `Number(cat.razdel_id)` for dropdown value. Do not change field names or drop the seed/filter or Kategoriya breaks.

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
- `manage_tickets` — chiptalar
- `manage_permissions` — huquqlar page

Default groups seeded: "Admin" (all), "Dissertatsiya mutaxassisi" (view+add+edit+download+stats), "Kuzatuvchi" (view only). Login returns `permissions` array (names). Auth headers: all diss API calls use `apiFetch` from `src/utils/api.js` which injects `Authorization: Bearer <token>`.

**Impersonation (superuser → vakil → back)** — Admin can "enter" a vakil via `/api/admin/login-as-expert`. Backend (`routes/admin.routes.js`) must: find the expert, populate `permissionGroup.permissions`, and return `{ token, user, permissions[] }` where `permissions` is the expert's active permission names. Frontend (`vakillar.vue`) must, before switching, save current session to `originalUser = { token, user, permissions }` and set `isImpersonating = 'true'`, then replace `token`, `user` and `permissions` with the expert's values and reload `/`. Topbar (`AppTopbar.vue`) must detect impersonation from localStorage and `originalUser`, and "Return to admin" must restore `token`, `user` and `permissions` from `originalUser`, clear impersonation flags, and redirect to `/vakillar`. This guarantees the menu and access rights match the active (real or impersonated) user.
