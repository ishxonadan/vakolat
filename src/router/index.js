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
          path: "/vakillar",
          name: "vakillar",
          component: () => import("@/views/pages/vakillar.vue"),
          meta: {
            requiresAuth: true,
            permission: "view_users",
          },
        },
        {
          path: "/vakil_add",
          name: "vakil_add",
          component: () => import("@/views/pages/vakil_add.vue"),
          meta: {
            requiresAuth: true,
            permission: "create_users",
          },
        },
        {
          path: "/vakil_edit/:id",
          name: "vakil_edit",
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
  } else {
    next()
  }
})

export default router
