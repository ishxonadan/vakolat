import { createRouter, createWebHistory } from "vue-router"
import AppLayout from "@/layout/AppLayout.vue"
import authService from "@/service/auth.service"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: "/",
          name: "dashboard",
          component: () => import("@/views/Dashboard.vue"),
          meta: { requiresAuth: true },
        },
        {
          path: "/tickets",
          name: "tickets",
          component: () => import("@/views/pages/tickets.vue"),
          meta: {
            requiresAuth: true,
            requiredLevel: "admin",
            requiredPermissions: ["manage_tickets"],
          },
        },
        {
          path: "/tashriflar",
          name: "tashriflar",
          component: () => import("@/views/pages/tashriflar.vue"),
          meta: {
            requiresAuth: true,
            requiredLevel: "admin",
            requiredPermissions: ["view_statistics"],
          },
        },
        {
          path: "/diss",
          name: "diss",
          component: () => import("@/views/pages/diss.vue"),
          meta: {
            requiresAuth: true,
            requiredPermissions: ["view_dissertations"],
          },
        },
        {
          path: "/vakillar",
          name: "vakillar",
          component: () => import("@/views/pages/vakillar.vue"),
          meta: {
            requiresAuth: true,
            requiredLevel: "admin",
            requiredPermissions: ["manage_users"],
          },
        },
        {
          path: "/huquqlar",
          name: "huquqlar",
          component: () => import("@/views/pages/huquqlar.vue"),
          meta: {
            requiresAuth: true,
            requiredLevel: "rais",
            requiredPermissions: ["manage_permissions"],
          },
        },
      ],
    },
    {
      path: "/auth",
      children: [
        {
          path: "login",
          name: "login",
          component: () => import("@/views/pages/auth/Login.vue"),
        },
      ],
    },
  ],
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = authService.isAuthenticated()

  if (requiresAuth && !isAuthenticated) {
    next("/auth/login")
    return
  }

  // Check permissions if route requires them
  if (to.meta.requiredPermissions) {
    if (!authService.hasPermissions(to.meta.requiredPermissions)) {
      next("/")
      return
    }
  }

  // Check level if route requires it
  if (to.meta.requiredLevel) {
    if (!authService.hasLevel(to.meta.requiredLevel)) {
      next("/")
      return
    }
  }

  next()
})

export default router
