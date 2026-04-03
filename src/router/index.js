import { createRouter, createWebHistory } from "vue-router"
import AppLayout from "@/layout/AppLayout.vue"
import authService from "@/service/auth.service"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("@/views/Dashboard.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss",
          name: "diss",
          component: () => import("@/views/pages/diss.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss/add",
          name: "diss_add",
          component: () => import("@/views/pages/diss_add.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss/edit/:uuid",
          name: "diss_edit",
          component: () => import("@/views/pages/diss_edit.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss/languages",
          name: "diss_languages",
          component: () => import("@/views/pages/diss_languages.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss/soha",
          name: "diss_soha",
          component: () => import("@/views/pages/diss_soha.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss/akademik-daraja",
          name: "diss_akademik_daraja",
          component: () => import("@/views/pages/diss_akademik_daraja.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "diss/ip-access",
          name: "ip_access",
          component: () => import("@/views/pages/ip-access.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/xodimlar",
          name: "xodimlar",
          component: () => import("@/views/pages/vakillar.vue"),
          meta: {
            requiresAuth: true,
            permission: "view_users",
          },
        },
        {
          path: "/xodimlar/logs",
          name: "xodim_logs",
          component: () => import("@/views/pages/vakil_logs.vue"),
          meta: {
            requiresAuth: true,
          },
        },
        {
          path: "/xodimlar/tashkiliy-bolimlar",
          name: "staff_departments",
          component: () => import("@/views/pages/staff_departments.vue"),
          meta: {
            requiresAuth: true,
            requiredLevel: "admin",
          },
        },
        {
          path: "/xodimlar/lavozimlar",
          name: "staff_positions",
          component: () => import("@/views/pages/staff_positions.vue"),
          meta: {
            requiresAuth: true,
            requiredLevel: "admin",
          },
        },
        {
          path: "/system",
          name: "system_control",
          component: () => import("@/views/system/SystemControlPage.vue"),
          meta: {
            requiresAuth: true,
            permission: "system_manage",
          },
        },
        {
          path: "/settings",
          name: "settings",
          component: () => import("@/views/settings/SettingsPage.vue"),
          meta: {
            requiresAuth: true,
          },
        },
        {
          path: "/settings/password",
          redirect: { path: "/settings" },
        },
        {
          path: "/settings/pagination",
          redirect: { path: "/settings", query: { tab: "pagination" } },
        },
        {
          path: "/xodim_add",
          name: "xodim_add",
          component: () => import("@/views/pages/vakil_add.vue"),
          meta: {
            requiresAuth: true,
            permission: "create_users",
          },
        },
        {
          path: "/xodim_edit/:id",
          name: "xodim_edit",
          component: () => import("@/views/pages/vakil_edit.vue"),
          meta: {
            requiresAuth: true,
            permission: "edit_users",
          },
        },
        {
          path: "/tashriflar",
          name: "tashriflar",
          component: () => import("@/views/pages/tashriflar.vue"),
          meta: {
            requiresAuth: true,
            permission: "view_statistics",
          },
        },
        {
          path: "/huquqlar",
          name: "huquqlar",
          component: () => import("@/views/pages/huquqlar.vue"),
          meta: {
            requiresAuth: true,
            adminOnly: true,
          },
        },
        {
          path: "/tickets",
          name: "tickets",
          component: () => import("@/views/pages/tickets.vue"),
          meta: {
            requiresAuth: true,
            permission: "view_tickets",
          },
        },
        {
          path: "/ticket_add",
          name: "ticket_add",
          component: () => import("@/views/pages/ticket_add.vue"),
          meta: {
            requiresAuth: true,
            permission: "create_tickets",
          },
        },
        {
          path: "/azo-bolganlar",
          name: "azo-bolganlar",
          component: () => import("@/views/pages/azo-bolganlar.vue"),
          meta: {
            requiresAuth: true,
            permission: "view_statistics",
          },
        },
        {
          path: "/payment/history",
          name: "payment_history",
          component: () => import("@/views/pages/payment_history.vue"),
          meta: {
            requiresAuth: true,
            permission: "payment_view_transactions",
          },
        },
        {
          path: "/payment/balances",
          name: "payment_balances",
          component: () => import("@/views/pages/payment_balances.vue"),
          meta: {
            requiresAuth: true,
            permissionsAny: [
              "payment_list_accounts",
              "payment_topup_user",
              "payment_withdraw_user",
              "payment_view_transactions",
              "payment_view_overview_stats",
            ],
          },
        },
        {
          path: "/payment/services",
          name: "payment_services",
          component: () => import("@/views/pages/payment_services.vue"),
          meta: {
            requiresAuth: true,
            permission: "payment_manage_services",
          },
        },
        {
          path: "/payment/departments",
          name: "payment_departments",
          component: () => import("@/views/pages/payment_departments.vue"),
          meta: {
            requiresAuth: true,
            permission: "payment_manage_departments",
          },
        },
        {
          path: "/payment/service-provision",
          name: "payment_service_provision",
          component: () => import("@/views/pages/payment_service_provision.vue"),
          meta: {
            requiresAuth: true,
            permission: "payment_provide_service",
          },
        },
      ],
    },
    {
      path: "/tv",
      name: "tv",
      component: () => import("@/views/pages/tv.vue"),
    },
    {
      path: "/auth/login",
      name: "login",
      component: () => import("@/views/pages/auth/Login.vue"),
    },
    {
      path: "/auth/access",
      name: "accessDenied",
      component: () => import("@/views/pages/auth/Access.vue"),
    },
    {
      path: "/auth/error",
      name: "error",
      component: () => import("@/views/pages/auth/Error.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notfound",
      component: () => import("@/views/pages/NotFound.vue"),
    },
  ],
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = authService.isAuthenticated()

  if (requiresAuth && !isAuthenticated) {
    next("/auth/login")
    return
  }

  const permissionMetas = to.matched
    .map((record) => record.meta)
    .filter((m) => m && (m.permission || (m.permissionsAny && m.permissionsAny.length)))
  const permissionMeta = permissionMetas.length ? permissionMetas[permissionMetas.length - 1] : null

  if (requiresAuth && isAuthenticated && permissionMeta) {
    if (permissionMeta.permission && !authService.hasPermission(permissionMeta.permission)) {
      next("/auth/access")
      return
    }
    if (
      permissionMeta.permissionsAny &&
      permissionMeta.permissionsAny.length > 0 &&
      !authService.hasAnyPermission(permissionMeta.permissionsAny)
    ) {
      next("/auth/access")
      return
    }
  }

  const levelRecord = [...to.matched].reverse().find((r) => r.meta?.requiredLevel)
  const requiredLevel = levelRecord?.meta?.requiredLevel
  if (requiresAuth && isAuthenticated && requiredLevel) {
    if (!authService.hasAccess(requiredLevel)) {
      next("/auth/access")
      return
    }
  }

  next()
})

export default router
