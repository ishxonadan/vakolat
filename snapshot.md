# Project snapshot (technical memory)

**Diss (dissertations)** — DB: yoqlama (diss). Documents, razdel (categories; schema `collection: 'razdel'`), Level, Language, Field (soha). Pagination: `/diss_list/:page?` + `?search=`, returns `{ results, total }`; backend `.limit()`/`.skip()`, search `$or` on code/title/author with `escapeRegex()`. Frontend lazy DataTable, server-side search debounced. Categories: load from `/diss/cats`; use `Promise.allSettled` so one failed request doesn’t leave others empty; `Array.isArray(data)` guard. Edit: level + type (both spellings Dissertatsiya/Dissertatisya in options); `category_id` normalized `Number()` for dropdown; language resolved by code or `aliases[]` from API; invalid language (not in Tillar) → red border + label "(ro'yxatda yo'q)", `validLanguageCodes` ref + `invalidLanguage` computed.

**Tillar** — Language schema: `name`, `code`, `aliases[]`, `isActive`. Seed uzb/rus/eng with aliases uz/ru/en; backfill aliases on existing docs. CRUD `/diss/languages`. Admin diss_languages.vue: aliases comma-sep. Add/edit use only `isActive === true`.

**Soha** — Field schema `code`, `name`, `collection: 'fields'`. Seed once from `content/soha.json` when empty. CRUD `/diss/fields`. Admin diss_soha.vue. Add/edit: Dropdown from `/diss/fields`, label `code - name`; `appendTo="self"`; panel CSS `left:0`, `max-width: min(100%, calc(100vw - 2rem))`, trigger shrink when open `:has(.p-dropdown-panel)`; items wrapper `overflow-x: auto`. Legacy soha_kodi: if doc value not in options, push option so selection shows.

**File replace (edit)** — Upload dir: `uploadsDir = path.resolve(process.cwd(), "uploads")`; multer and copy both use it. `diss_save/:uuid`: copy from `uploadFolder` using `path.basename(originalUploadedFilename)`; 400 if source missing. Frontend: show `result.error`/`result.details` in toast on save failure.

**Akademik daraja (levels)** — Level schema: name, mark (unique), isActive. Seed when empty: nomzod, doktor, doktor_fan. CRUD GET/POST/PUT/DELETE `/diss/levels`. Admin page `/diss/akademik-daraja` (diss_akademik_daraja.vue). Add/edit use levelOptions from API (diss add/edit already use GET /diss/levels).

**Routes/menu** — Dissertatsiya: Hujjatlar, Tillar (`/diss/languages`), Soha (`/diss/soha`), Akademik daraja (`/diss/akademik-daraja`), To'liq matnga ruxsat. Permission `view_dissertations` for diss pages.
