# Graph Report - vakolat  (2026-09-19)

## Corpus Check
- 188 files · ~210,292 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: .scss 17, (none) 4, .css 4)

## Summary
- 2065 nodes · 2985 edges · 137 communities (117 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4b92cdf5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- azo-bolganlar.vue
- tv.vue
- tashriflar.vue
- Enhanced Test Suite - What Was Added
- diss_edit.vue
- payment_balances.vue
- onlayn-royxatdan-otganlar.vue
- WebcamCapture.vue
- package.json
- InputDoc.vue
- payment_service_provision.vue
- diss_add.vue
- payment_statistics.vue
- Test Suite Summary
- dependencies
- ticket_add.vue
- express
- ip-access.vue
- tickets.vue
- Crud.vue
- collect-data.vue
- huquqlar.vue
- mongoose
- TableDoc.vue
- AuthService
- diss.vue
- OverlayDoc.vue
- jsonwebtoken
- jadval.vue
- devDependencies
- vue
- diss_soha.vue
- vakil_edit.vue
- update-graph.js
- api.service.js
- ChartDoc.vue
- diss_statistics.vue
- plausible-debug.vue
- vakil_logs.vue
- 3) Concrete implementation guidance
- PlausibleService
- add.vue
- diss_akademik_daraja.vue
- diss_languages.vue
- library-locations.vue
- MemberList.vue
- payment_history.vue
- vakillar.vue
- Test Coverage
- staff_positions.vue
- vakil_add.vue
- tickets.routes.js
- router/index.js
- models/index.js
- staff_departments.vue
- AppConfigurator.vue
- payment_services.vue
- MenuDoc.vue
- mocks.js
- pagination.service.js
- AppMenu.vue
- MemberForm.vue
- auth.middleware.js
- memberSearchFilter.js
- migrate-pullik.js
- AppTopbar.vue
- rate.vue
- apiFetch
- payment_departments.vue
- admin.routes.js
- survey.routes.js
- Changelog
- .prettierrc.json
- import-oquv-zallari-staff.js
- SessionTimer.vue
- AppLayout.vue
- ListDoc.vue
- recoverFromSleep
- playNextVideo
- MessagesDoc.vue
- createTicketsRoutes
- primevue
- barcode.test.js
- cleanup
- AppMenuItem.vue
- MediaDoc.vue
- plausible.service.js
- scripts
- uznel.service.js
- online-registrants.routes.js
- import-payment-services-2026.js
- debug-pullik-user.js
- buildVideoUrl
- vite.config.mjs
- audit.service.js
- seed-staff.js
- staff-departments.routes.js
- capturePhotoWithBestFrame
- startFaceDetection
- itemCost
- phoneNumber.js
- tv.routes.js
- loadProvisions
- buildMemberPayload
- jsconfig.json
- fetchMembers
- confirmCrop
- detectFace
- formatCountdown
- parseIdMrz.js
- db-connections.js
- seed-permissions.js
- ticket-functions.test.js
- vercel.json
- readme.md
- addItem
- loadStatistics
- applyParsedId
- calculateTickerDuration
- cellExportValue
- logo.test.js
- formatMonthLabel
- activePeriodLabel
- isPeriodOptionDisabled
- PanelsDoc.vue
- debug-pullik-service-pricing-source.js

## God Nodes (most connected - your core abstractions)
1. `vue` - 67 edges
2. `primevue` - 46 edges
3. `router` - 36 edges
4. `mongoose` - 31 edges
5. `ApiService` - 29 edges
6. `vue-router` - 26 edges
7. `apiFetch()` - 26 edges
8. `express` - 24 edges
9. `verifyToken()` - 23 edges
10. `AuthService` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Project snapshot (technical memory)` --references--> `verifyToken()`  [INFERRED]
  snapshot.md → src/middleware/auth.middleware.js
- `Project snapshot (technical memory)` --references--> `checkAnyPermissions()`  [INFERRED]
  snapshot.md → src/middleware/auth.middleware.js
- `Project snapshot (technical memory)` --references--> `apiFetch()`  [INFERRED]
  snapshot.md → src/utils/api.js
- `createTicketsRoutes()` --calls--> `checkPermissions()`  [EXTRACTED]
  server.js → src/middleware/auth.middleware.js
- `toggleActive()` --calls--> `apiFetch()`  [EXTRACTED]
  src/views/pages/diss_akademik_daraja.vue → src/utils/api.js

## Import Cycles
- None detected.

## Communities (137 total, 20 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.04
Nodes (48): adminRoutes, app, APP_ENV_ALIASES, appEnvRaw, { attachApiAudit }, auditRoutes, authRoutes, backupFolder (+40 more)

### Community 1 - "azo-bolganlar.vue"
Cohesion: 0.07
Nodes (30): activeTab, applySearch(), buildSearchBody(), categories, currentPage, exportExcel(), exporting, fetchMembers() (+22 more)

### Community 2 - "tv.vue"
Cohesion: 0.04
Nodes (34): currentTickerIndex, currentTickerText, currentVideoIndex, currentVideoUrl, events, eventsLoading, hasMinimalEvents, isManuallyPaused (+26 more)

### Community 3 - "tashriflar.vue"
Cohesion: 0.06
Nodes (38): api, apiInterceptor, autoRefreshEnabled, autoRefreshInterval, clearFilters(), currentPage, dateRangeFilter, dateRangeStats (+30 more)

### Community 4 - "Enhanced Test Suite - What Was Added"
Cohesion: 0.05
Nodes (41): 1. Test Organization, 2. Test Quality, 3. Code Reusability, 4. Documentation, 5. Security, 6. Integration, After, After (Comprehensive Test) (+33 more)

### Community 5 - "diss_edit.vue"
Cohesion: 0.05
Nodes (36): additional, annotation, approved_date, ashyo, author, categories, category_id, code (+28 more)

### Community 6 - "payment_balances.vue"
Cohesion: 0.06
Nodes (33): amount, canProvideService, canQuickSearch, canSpend, canTopup, canViewOverview, canViewUserTransactions, comment (+25 more)

### Community 7 - "onlayn-royxatdan-otganlar.vue"
Cohesion: 0.07
Nodes (22): activeTab, categories, currentPage, exporting, fetchUserVisits(), imageSource, isEditMode, loading (+14 more)

### Community 8 - "WebcamCapture.vue"
Cohesion: 0.05
Nodes (36): autoColorCorrection, autoCountdownDisabled, autoDetectFace, cameraReady, cameras, canvasElement, capturedFrames, capturedImage (+28 more)

### Community 9 - "package.json"
Cohesion: 0.06
Nodes (35): author, description, keywords, license, main, name, version, autoprefixer (+27 more)

### Community 10 - "InputDoc.vue"
Cohesion: 0.06
Nodes (31): CountryService, NodeService, autoFilteredValue, autoValue, calendarValue, checkboxValue, colorValue, dropdownValue (+23 more)

### Community 11 - "payment_service_provision.vue"
Cohesion: 0.06
Nodes (27): account, canCancel, cancellingId, currentBalance, customPricedServiceOption, departments, form, hasEnoughBalance (+19 more)

### Community 12 - "diss_add.vue"
Cohesion: 0.06
Nodes (31): additional, annotation, approved_date, ashyo, author, categories, category_id, code (+23 more)

### Community 13 - "payment_statistics.vue"
Cohesion: 0.07
Nodes (25): activePresetLabel, activeSectionIndex, currentSpendingMonth, currentTopupMonth, customRange, dayDetailsLoading, detailSortField, detailSortOrder (+17 more)

### Community 14 - "Test Suite Summary"
Cohesion: 0.07
Nodes (29): Adding New Tests, API Operations, Authentication & Authorization, Business Logic, Business Logic Tests (42 tests), Configuration Files, Core Functionality Tests (95 tests), Data Models (+21 more)

### Community 15 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, axios, bcrypt, chart.js, cheerio, concurrently, cors, docx (+21 more)

### Community 16 - "ticket_add.vue"
Cohesion: 0.09
Nodes (18): createTicket(), errors, existingUser, form, formatDate(), generatedTicket, isAutoFilled, isExistingTicket (+10 more)

### Community 17 - "express"
Cohesion: 0.09
Nodes (20): express, express, router, { verifyToken, checkUserLevel }, express, router, { verifyToken, checkUserLevel }, express (+12 more)

### Community 18 - "ip-access.vue"
Cohesion: 0.10
Nodes (24): closeDialog(), currentIP, currentPage, dialogVisible, error, errors, fetchIPs(), first (+16 more)

### Community 19 - "tickets.vue"
Cohesion: 0.10
Nodes (20): allTickets, applyFilters(), calendarDayKey(), canCreate, clearDateFilter(), clearSearch(), filterDate, formatDate() (+12 more)

### Community 20 - "Crud.vue"
Cohesion: 0.09
Nodes (15): createId(), deleteProductDialog, deleteProductsDialog, dt, exportCSV(), filters, findIndexById(), product (+7 more)

### Community 21 - "collect-data.vue"
Cohesion: 0.09
Nodes (17): cacheData, collectAllData(), collectOptions, currentYear, fetchResults, forceRefresh, isFetching, isLoading (+9 more)

### Community 22 - "huquqlar.vue"
Cohesion: 0.11
Nodes (20): activePermissions, confirm, confirmDeleteGroup(), confirmDeletePermission(), currentGroup, currentPermission, loadingGroups, loadingPermissions (+12 more)

### Community 23 - "mongoose"
Cohesion: 0.08
Nodes (15): mongoose, express, mongoose, { verifyToken, checkPermissions, checkAnyPermissions }, express, { verifyToken, checkPermissions }, mongoose, mongoose (+7 more)

### Community 24 - "TableDoc.vue"
Cohesion: 0.09
Nodes (12): ref_primevue_core, CustomerService, balanceFrozen, customers1, customers2, customers3, expandedRows, filters1 (+4 more)

### Community 26 - "diss.vue"
Cohesion: 0.11
Nodes (19): authHeaders(), canAdd, canDelete, canDownload, canEdit, canView, currentPage, documents (+11 more)

### Community 27 - "OverlayDoc.vue"
Cohesion: 0.09
Nodes (14): confirmPopup, display, displayConfirmation, op, op2, popup, products, selectedProduct (+6 more)

### Community 28 - "jsonwebtoken"
Cohesion: 0.10
Nodes (16): bcrypt, chai, jsonwebtoken, fixtures, jwt, { expect }, jwt, { expect } (+8 more)

### Community 29 - "jadval.vue"
Cohesion: 0.10
Nodes (13): currentYear, debugInfo, error, fetchResults(), isLoading, isSuperAdmin, months, results (+5 more)

### Community 30 - "devDependencies"
Cohesion: 0.10
Nodes (20): devDependencies, autoprefixer, chai, eslint, eslint-plugin-vue, jsdom, jsdom-global, mocha (+12 more)

### Community 31 - "vue"
Cohesion: 0.13
Nodes (8): vue, items, loading, dropdownItem, dropdownItems, value, events, horizontalEvents

### Community 32 - "diss_soha.vue"
Cohesion: 0.12
Nodes (16): closeDialog(), confirm, confirmDelete(), dialogVisible, editingId, error, fetchFields(), fields (+8 more)

### Community 33 - "vakil_edit.vue"
Cohesion: 0.10
Nodes (17): confirmPassword, firstname, isActive, lastname, legacyPositionHint, loading, nickname, password (+9 more)

### Community 34 - "update-graph.js"
Cohesion: 0.11
Nodes (18): ref_child_process, ref_fs, ref_os, ref_path, express, fs, path, router (+10 more)

### Community 35 - "api.service.js"
Cohesion: 0.13
Nodes (14): jwt-decode, ApiService, handleUnauthorized(), confirmPassword, currentPassword, loading, newPassword, toast (+6 more)

### Community 36 - "ChartDoc.vue"
Cohesion: 0.15
Nodes (11): barData, barOptions, { getPrimary, getSurface, isDarkTheme }, lineData, lineOptions, pieData, pieOptions, polarData (+3 more)

### Community 37 - "diss_statistics.vue"
Cohesion: 0.15
Nodes (17): activePeriodLabel, applyCustomRange(), customRange, formatDateDisplay(), formatDateToYmd(), getPresetRange(), isPeriodOptionDisabled(), loading (+9 more)

### Community 38 - "plausible-debug.vue"
Cohesion: 0.11
Nodes (15): cacheData, currentYear, fetchPlausibleData(), fetchResults, forceRefresh, isFetching, isLoading, isSuperAdmin (+7 more)

### Community 39 - "vakil_logs.vue"
Cohesion: 0.12
Nodes (16): dissertationUsers, loadingLogs, loadingStats, loadLogs(), logs, onPage(), page, paymentUsers (+8 more)

### Community 40 - "3) Concrete implementation guidance"
Cohesion: 0.11
Nodes (17): 1) Existing system behavior you must preserve, 2) New feature requirements (Payme side), 3) Concrete implementation guidance, 4) Non-functional requirements, 5) Acceptance criteria checklist, 6) Notes for implementer, A. Backend endpoint for Payme top-up, B. Validation and normalization (+9 more)

### Community 41 - "PlausibleService"
Cohesion: 0.23
Nodes (4): cheerio, ref_https, ref_url, PlausibleService

### Community 42 - "add.vue"
Cohesion: 0.11
Nodes (13): clock, contractDate, contractStart, dropdownValue, dropdownValues, dropdownValues2, dropdownValues3, passportExpireDate (+5 more)

### Community 43 - "diss_akademik_daraja.vue"
Cohesion: 0.14
Nodes (15): closeDialog(), confirm, confirmDelete(), dialogVisible, editingId, error, fetchLevels(), formData (+7 more)

### Community 44 - "diss_languages.vue"
Cohesion: 0.14
Nodes (15): closeDialog(), confirm, confirmDelete(), dialogVisible, editingId, error, fetchLanguages(), formData (+7 more)

### Community 45 - "library-locations.vue"
Cohesion: 0.14
Nodes (16): availableOrganizations, currentLocation, deleteLocation(), isEditing, isLoading, isSuperAdmin, loadAvailableOrganizations(), loadLocations() (+8 more)

### Community 46 - "MemberList.vue"
Cohesion: 0.09
Nodes (19): allColumns, applySearchNow(), clearSearch(), columnsPopover, columnWidths, defaultVisibleFields, emit, first (+11 more)

### Community 47 - "payment_history.vue"
Cohesion: 0.14
Nodes (12): paymentTransactionDirectionLabel(), paymentTransactionTypeLabel(), TX_DIRECTION_LABELS, TX_TYPE_LABELS, filters, loading, loadTransactions(), onPage() (+4 more)

### Community 48 - "vakillar.vue"
Cohesion: 0.15
Nodes (13): departmentFilterOptions, error, fetchData(), filteredProducts, isLoading, isSuperAdmin, loginAsExpert(), products (+5 more)

### Community 49 - "Test Coverage"
Cohesion: 0.12
Nodes (16): Best Practices Demonstrated, Helpers (Test Utilities), Integration, Middleware, Models, Notes, Running Tests, Security (+8 more)

### Community 50 - "staff_positions.vue"
Cohesion: 0.17
Nodes (15): sortablejs, activeCount, addNew(), deleteRow(), destroySortable(), initSortable(), listRef, loadCatalog() (+7 more)

### Community 51 - "vakil_add.vue"
Cohesion: 0.12
Nodes (14): confirmPassword, firstname, isActive, lastname, nickname, password, permissionGroupCatalog, router (+6 more)

### Community 52 - "tickets.routes.js"
Cohesion: 0.25
Nodes (4): qrcode, express, QRCode, router

### Community 53 - "router/index.js"
Cohesion: 0.11
Nodes (16): vue-router, { toggleDarkMode, isDarkTheme }, router, loading, stats, angle, animatedStyle, checked (+8 more)

### Community 54 - "models/index.js"
Cohesion: 0.09
Nodes (21): auditLogSchema, mongoose, mongoose, plausibleCacheSchema, mongoose, ratingAssignmentSchema, websiteRatingSchema, mongoose (+13 more)

### Community 55 - "staff_departments.vue"
Cohesion: 0.20
Nodes (14): activeCount, addNew(), confirm, deleteRow(), isDefaultUnassignedDept(), loadCatalog(), loading, newDeptName (+6 more)

### Community 56 - "AppConfigurator.vue"
Cohesion: 0.19
Nodes (12): applyTheme(), getPresetExt(), { layoutConfig, setPrimary, setSurface, setPreset, isDarkTheme, setMenuMode }, menuMode, menuModeOptions, onPresetChange(), preset, presetOptions (+4 more)

### Community 57 - "payment_services.vue"
Cohesion: 0.16
Nodes (9): form, loading, loadServices(), removeItem(), save(), services, showDialog, toast (+1 more)

### Community 58 - "MenuDoc.vue"
Cohesion: 0.14
Nodes (11): breadcrumbHome, breadcrumbItems, contextMenu, contextMenuItems, megamenuItems, menu, menuitems, nestedMenuitems (+3 more)

### Community 60 - "pagination.service.js"
Cohesion: 0.23
Nodes (8): props, clampPageSize(), DEFAULT_PAGE_SIZE, loadPageSize(), pageSize, ROWS_PER_PAGE_OPTIONS, options, toast

### Community 61 - "AppMenu.vue"
Cohesion: 0.19
Nodes (12): filteredModel, findActiveMenuItemKeyForPath(), hasAccess(), logout(), logoutSection, menuItems, model, route (+4 more)

### Community 62 - "MemberForm.vue"
Cohesion: 0.06
Nodes (34): activeDialCode, addrs, birthday, customPhoneCode, dataURLtoFile(), email, emit, fetchingUserNo (+26 more)

### Community 63 - "auth.middleware.js"
Cohesion: 0.09
Nodes (22): Auth, bcrypt, {
  collectPermissionNamesFromPopulatedUser,
  normalizePermissionGroupIds,
}, express, jwt, mongoose, router, { verifyToken, checkUserLevel } (+14 more)

### Community 64 - "memberSearchFilter.js"
Cohesion: 0.24
Nodes (14): ALLOWED_FILTER_FIELDS, buildMemberSearchFilter(), compileFieldFilter(), dateRangeClause(), DEFAULT_SEARCH_FIELDS, escapeRegex(), matchAnyField(), parseLimit() (+6 more)

### Community 65 - "migrate-pullik.js"
Cohesion: 0.24
Nodes (11): BATCH_SIZE, classifyMovementDirection(), CURSOR_BATCH_SIZE, getFirst(), mongoose, normalizeReaderId(), RESET_MIGRATION, run() (+3 more)

### Community 66 - "AppTopbar.vue"
Cohesion: 0.17
Nodes (9): currentUser, displayFullName, displayPosition, isImpersonating, logout(), { onMenuToggle, toggleDarkMode, isDarkTheme }, originalUser, router (+1 more)

### Community 67 - "rate.vue"
Cohesion: 0.20
Nodes (9): assigningWebsites, assignments, assignWebsites(), error, fetchAssignments(), isLoading, maxExpertsReached, router (+1 more)

### Community 68 - "apiFetch"
Cohesion: 0.18
Nodes (9): apiFetch(), loadAcademicDegrees(), loadCategories(), loadLanguages(), loadSohaFields(), saveData(), loadLanguages(), loadLevels() (+1 more)

### Community 69 - "payment_departments.vue"
Cohesion: 0.22
Nodes (8): departmentForm, departments, loadDepartments(), loadingDepartments, removeDepartment(), saveDepartment(), showDepartmentDialog, toast

### Community 70 - "admin.routes.js"
Cohesion: 0.24
Nodes (9): calculateSorovnomaScore(), { checkUserLevel }, { collectPermissionNamesFromPopulatedUser }, domainsMatch(), express, extractDomain(), jwt, PlausibleService (+1 more)

### Community 71 - "survey.routes.js"
Cohesion: 0.16
Nodes (7): ref_crypto, express, router, { verifyToken }, crypto, express, router

### Community 72 - "Changelog"
Cohesion: 0.22
Nodes (8): 3.10.0 (2024-03-11), 3.6.0 (2023-04-12), 3.7.0 (2023-05-06), 3.8.0 (2023-07-24), 3.9.0 (2023-11-01), 4.0.0 (2024-07-29), 4.1.0 (2024-07-29), Changelog

### Community 73 - ".prettierrc.json"
Cohesion: 0.22
Nodes (8): bracketSameLine, printWidth, semi, singleQuote, tabWidth, trailingComma, useTabs, vueIndentScriptAndStyle

### Community 74 - "import-oquv-zallari-staff.js"
Cohesion: 0.33
Nodes (8): bcrypt, cleanName(), mongoose, normalizeForMatch(), run(), sanitizeLoginPart(), splitFullName(), staffRows

### Community 75 - "SessionTimer.vue"
Cohesion: 0.25
Nodes (8): calculateTimeLeft(), checkInterval, checkSession(), formatTimeLeft, isAuthenticated, router, timeLeft, toast

### Community 76 - "AppLayout.vue"
Cohesion: 0.25
Nodes (5): bindOutsideClickListener(), containerClass, isOutsideClicked(), { layoutConfig, layoutState, isSidebarActive, resetMenu }, outsideClickListener

### Community 77 - "ListDoc.vue"
Cohesion: 0.25
Nodes (6): ProductService, layout, options, orderlistProducts, picklistProducts, products

### Community 78 - "recoverFromSleep"
Cohesion: 0.28
Nodes (9): checkVideoHealth(), detectSystemSleep(), fetchStats(), fetchTickerTexts(), handleVisibilityChange(), handleWindowFocus(), recoverFromSleep(), showSystemStatusMessage() (+1 more)

### Community 79 - "playNextVideo"
Cohesion: 0.25
Nodes (9): nextVideo(), onMouseMove(), onVideoEnded(), onVideoError(), playNextVideo(), previousVideo(), showControlsTemporarily(), toggleMute() (+1 more)

### Community 80 - "MessagesDoc.vue"
Cohesion: 0.22
Nodes (4): email, message, toast, username

### Community 81 - "createTicketsRoutes"
Cohesion: 0.43
Nodes (5): createTicketsRoutes(), getNextDailyOrderNumber(), getTodayNormalized(), hasTicketForToday(), normalizeToCalendarDay()

### Community 82 - "primevue"
Cohesion: 0.14
Nodes (10): @primeuix/styled, primevue, @primevue/themes, src_assets_styles, src_assets_tailwind, app, AuraSoftDark, fileupload (+2 more)

### Community 83 - "barcode.test.js"
Cohesion: 0.50
Nodes (3): generateBarcode(), { expect }, { generateBarcode }

### Community 84 - "cleanup"
Cohesion: 0.32
Nodes (8): cleanup(), onDrag(), onResize(), startDrag(), startResize(), stopDrag(), stopFaceDetection(), stopResize()

### Community 85 - "AppMenuItem.vue"
Cohesion: 0.18
Nodes (8): isActiveMenu, itemKey, { layoutState, setActiveMenuItem, onMenuToggle }, props, route, layoutConfig, layoutState, useLayout()

### Community 86 - "MediaDoc.vue"
Cohesion: 0.29
Nodes (5): PhotoService, carouselResponsiveOptions, galleriaResponsiveOptions, images, products

### Community 87 - "plausible.service.js"
Cohesion: 0.25
Nodes (5): axios, axios, cheerio, { expect }, PlausibleService

### Community 88 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, graph, migrate:pullik, start, test

### Community 89 - "uznel.service.js"
Cohesion: 0.16
Nodes (30): addYearsYyyymmdd(), assertUznelOk(), axios, buildDupChkXml(), buildImageRegXml(), buildInfoRegXml(), buildUserCols(), buildUserDataset() (+22 more)

### Community 90 - "online-registrants.routes.js"
Cohesion: 0.50
Nodes (7): applyCreateDefaults(), createOnlineRegistrant(), formatUserNo(), generateNextUserNo(), parseUserNo(), sanitizePayload(), syncToCache()

### Community 91 - "import-payment-services-2026.js"
Cohesion: 0.29
Nodes (5): mongoose, NEW_SERVICES, paymentServiceSchema, paymentTransactionSchema, WRITE_MODE

### Community 92 - "debug-pullik-user.js"
Cohesion: 0.60
Nodes (4): getFirst(), mongoose, normalizeReaderId(), run()

### Community 93 - "buildVideoUrl"
Cohesion: 0.33
Nodes (7): buildVideoUrl(), encodeVideoFilename(), fetchVideoList(), getNextKlipVideo(), getNextVideo(), initializePlaylists(), shuffleArray()

### Community 94 - "vite.config.mjs"
Cohesion: 0.33
Nodes (5): ref_node_url, @primevue/auto-import-resolver, unplugin-vue-components, vite, @vitejs/plugin-vue

### Community 95 - "audit.service.js"
Cohesion: 0.48
Nodes (6): attachApiAudit(), getAuditModel(), jwt, logExplicitAction(), shouldSkipApiAudit(), shouldSkipUser()

### Community 96 - "seed-staff.js"
Cohesion: 0.33
Nodes (5): routes_staff_departments_constants_default_unassigned_staff_department_name, { DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME }, ensureDefaultStaffDepartment(), ensureStaffPositionsSeed(), migrateStaffPositionSortOrderToOneBased()

### Community 97 - "staff-departments.routes.js"
Cohesion: 0.33
Nodes (4): { DEFAULT_UNASSIGNED_STAFF_DEPARTMENT_NAME }, express, mongoose, { verifyToken, checkUserLevel }

### Community 98 - "capturePhotoWithBestFrame"
Cohesion: 0.40
Nodes (6): capturePhoto(), capturePhotoWithBestFrame(), capturePhotoWithFace(), initManualCropWithFace(), selectFrame(), startCountdown()

### Community 99 - "startFaceDetection"
Cohesion: 0.33
Nodes (6): initCamera(), loadFaceDetectionModels(), onAutoDetectToggle(), startCamera(), startFaceDetection(), switchCamera()

### Community 100 - "itemCost"
Cohesion: 0.33
Nodes (6): isCustomService(), itemCost(), serviceById(), serviceOptionLabel(), submitProvision(), totalCost

### Community 101 - "phoneNumber.js"
Cohesion: 0.13
Nodes (20): capPhoneLocal(), displayDialCode(), isCustomDialCode, onCustomPhoneCodeInput(), onPhoneLocalInput(), phoneLocalDisplay, CODES_BY_LENGTH, composePhoneNumber() (+12 more)

### Community 102 - "tv.routes.js"
Cohesion: 0.33
Nodes (5): agent, axios, express, https, router

### Community 103 - "loadProvisions"
Cohesion: 0.50
Nodes (5): cancelProvision(), loadProvisions(), loadUser(), normalizeUserNoInput(), searchUser()

### Community 104 - "buildMemberPayload"
Cohesion: 0.40
Nodes (6): buildMemberPayload(), onSaveMember(), pad2(), parseBirthday(), syncToUznel(), toLocalYyyymmdd()

### Community 105 - "jsconfig.json"
Cohesion: 0.50
Nodes (3): compilerOptions, paths, exclude

### Community 106 - "fetchMembers"
Cohesion: 0.33
Nodes (6): applySearch(), buildSearchBody(), exportExcel(), fetchMembers(), onUpdateCurrentPage(), saveMember()

### Community 107 - "confirmCrop"
Cohesion: 0.50
Nodes (4): applyColorCorrection(), confirmCrop(), dialogVisible, emit

### Community 108 - "detectFace"
Cohesion: 0.50
Nodes (4): captureFrameForSelection(), checkIfLookingAtCamera(), detectFace(), stopCountdown()

### Community 109 - "formatCountdown"
Cohesion: 0.50
Nodes (4): canCancelRow(), cancelButtonLabel(), formatCountdown(), getCancelDeadline()

### Community 110 - "parseIdMrz.js"
Cohesion: 0.32
Nodes (13): onPinflInput(), compactMrz(), extractPinfl(), looksLikeIdMrz(), mrzNamePart(), normalizeSex(), parseIdMrz(), parseTd1() (+5 more)

### Community 113 - "ticket-functions.test.js"
Cohesion: 0.50
Nodes (3): { expect }, getTodayNormalized(), normalizeToCalendarDay()

### Community 118 - "loadStatistics"
Cohesion: 0.29
Nodes (8): applyCustomRange(), formatDateToYmd(), getPresetRange(), loadPresetStatistics(), loadStatistics(), normalizeMonthBuckets(), pad2(), resolveMonthKeysInRange()

### Community 119 - "applyParsedId"
Cohesion: 0.33
Nodes (7): applyParsedId(), consumeScanBuffer(), ensureNationalityOption(), onScanKeydown(), onScanPaste(), takeScanSnapshot(), isMrzCharsetKey()

### Community 130 - "cellExportValue"
Cohesion: 0.40
Nodes (5): cellExportValue(), csvValue(), displayPassport(), downloadCsv(), formatDate()

### Community 131 - "logo.test.js"
Cohesion: 0.50
Nodes (3): getLibraryLogoSvg(), { expect }, { getLibraryLogoSvg }

### Community 132 - "formatMonthLabel"
Cohesion: 0.67
Nodes (3): formatMonthLabel(), spendingMonthOptions, topupMonthOptions

### Community 135 - "PanelsDoc.vue"
Cohesion: 0.40
Nodes (4): cardMenu, items, menuRef, toggle()

### Community 136 - "debug-pullik-service-pricing-source.js"
Cohesion: 0.67
Nodes (3): inspectCollection(), mongoose, run()

## Knowledge Gaps
- **1125 isolated node(s):** `useTabs`, `tabWidth`, `trailingComma`, `semi`, `singleQuote` (+1120 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1367 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `vue` to `azo-bolganlar.vue`, `tv.vue`, `tashriflar.vue`, `diss_edit.vue`, `payment_balances.vue`, `onlayn-royxatdan-otganlar.vue`, `WebcamCapture.vue`, `package.json`, `InputDoc.vue`, `payment_service_provision.vue`, `diss_add.vue`, `payment_statistics.vue`, `PanelsDoc.vue`, `ticket_add.vue`, `ip-access.vue`, `tickets.vue`, `Crud.vue`, `collect-data.vue`, `huquqlar.vue`, `TableDoc.vue`, `diss.vue`, `OverlayDoc.vue`, `jadval.vue`, `diss_soha.vue`, `vakil_edit.vue`, `api.service.js`, `ChartDoc.vue`, `diss_statistics.vue`, `plausible-debug.vue`, `vakil_logs.vue`, `add.vue`, `diss_akademik_daraja.vue`, `diss_languages.vue`, `library-locations.vue`, `MemberList.vue`, `payment_history.vue`, `vakillar.vue`, `staff_positions.vue`, `vakil_add.vue`, `router/index.js`, `staff_departments.vue`, `AppConfigurator.vue`, `payment_services.vue`, `MenuDoc.vue`, `pagination.service.js`, `AppMenu.vue`, `MemberForm.vue`, `AppTopbar.vue`, `rate.vue`, `payment_departments.vue`, `SessionTimer.vue`, `AppLayout.vue`, `ListDoc.vue`, `MessagesDoc.vue`, `primevue`, `AppMenuItem.vue`, `MediaDoc.vue`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Why does `primevue` connect `primevue` to `azo-bolganlar.vue`, `tashriflar.vue`, `diss_edit.vue`, `payment_balances.vue`, `onlayn-royxatdan-otganlar.vue`, `WebcamCapture.vue`, `package.json`, `payment_service_provision.vue`, `diss_add.vue`, `payment_statistics.vue`, `ticket_add.vue`, `ip-access.vue`, `tickets.vue`, `Crud.vue`, `collect-data.vue`, `huquqlar.vue`, `diss.vue`, `OverlayDoc.vue`, `diss_soha.vue`, `vakil_edit.vue`, `api.service.js`, `diss_statistics.vue`, `plausible-debug.vue`, `vakil_logs.vue`, `diss_akademik_daraja.vue`, `diss_languages.vue`, `library-locations.vue`, `MemberList.vue`, `payment_history.vue`, `vakillar.vue`, `staff_positions.vue`, `vakil_add.vue`, `router/index.js`, `staff_departments.vue`, `payment_services.vue`, `pagination.service.js`, `MemberForm.vue`, `rate.vue`, `payment_departments.vue`, `SessionTimer.vue`, `MessagesDoc.vue`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Why does `mongoose` connect `mongoose` to `memberSearchFilter.js`, `staff-departments.routes.js`, `migrate-pullik.js`, `debug-pullik-service-pricing-source.js`, `package.json`, `import-oquv-zallari-staff.js`, `db-connections.js`, `express`, `models/index.js`, `online-registrants.routes.js`, `import-payment-services-2026.js`, `debug-pullik-user.js`, `auth.middleware.js`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `useTabs`, `tabWidth`, `trailingComma` to the rest of the system?**
  _1125 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `azo-bolganlar.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.06507936507936508 - nodes in this community are weakly interconnected._
- **Should `tv.vue` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._