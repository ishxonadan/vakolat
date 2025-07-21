import AppLayout from "@/layout/AppLayout.vue"
import { createRouter, createWebHistory } from "vue-router"
import authService from "@/service/auth.service"

const routes = [
  {
    path: "/",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "/",
        name: "dashboard",
        component: () => import("@/views/Dashboard.vue"),
      },
      {
        path: "/rate",
        name: "Ekspertlar bahosi",
        component: () => import("@/views/pages/rate.vue"),
      },
      {
        path: "/experts",
        name: "Expertlar",
        component: () => import("@/views/pages/experts.vue"),
        meta: { requiredLevel: "admin" },
      },
      {
        path: "/expert_add",
        name: "Expert qo'shish",
        component: () => import("@/views/pages/expert_add.vue"),
        meta: { requiredLevel: "admin" },
      },
      {
        path: "/expert_edit/:id",
        name: "Ekpertni o'zgartirish",
        component: () => import("@/views/pages/expert_edit.vue"),
        meta: { requiredLevel: "admin" },
      },
      {
        path: "/contestants",
        name: "Ishtirokchilar",
        component: () => import("@/views/pages/contestants.vue"),
      },
      {
        path: "/contestant_add",
        name: "Ishtirokchi qo'shish",
        component: () => import("@/views/pages/contestant_add.vue"),
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/contestant_edit/:id",
        name: "Ishtirokchini o'zgartirish",
        component: () => import("@/views/pages/contestant_edit.vue"),
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/diss",
        name: "Dissertatsiyalar",
        component: () => import("@/views/pages/diss.vue"),
      },
      {
        path: "/add",
        name: "add",
        component: () => import("@/views/pages/add.vue"),
      },
      {
        path: "/diss_add",
        name: "Dissertatsiya qo'shish",
        component: () => import("@/views/pages/diss_add.vue"),
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/diss_edit/:uuid",
        name: "Dissertatsiya o'zgartirish",
        component: () => import("@/views/pages/diss_edit.vue"),
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/rate-website/:id",
        name: "Veb-saytni baholash",
        component: () => import("@/views/pages/rate-website.vue"),
        meta: { requiredLevel: "expert" },
      },
      // Add the new rating-results route
      {
        path: "/rating-results",
        name: "Baholash natijalari",
        component: () => import("@/views/pages/rating-results.vue"),
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/jadval",
        name: "Baholash jadvali",
        component: () => import("@/views/pages/jadval.vue"),
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/auto-evaluation",
        name: "Avtomatik baholash",
        component: () => import("@/views/pages/auto-evaluation.vue"),
        meta: { requiredLevel: "rais" },
      },
      // Add the user evaluation route
      {
        path: "/user-evaluation",
        name: "Foydalanuvchi baholash",
        component: () => import("@/views/pages/user-evaluation.vue"),
        meta: { requiredLevel: "rais" },
      },
      // Add new manual correction routes with SEPARATE components
      {
        path: "/user-correction",
        name: "User baholarini to'g'rilash",
        component: () => import("@/views/pages/user-correction.vue"), // SEPARATE FILE
        meta: { requiredLevel: "rais" },
      },
      {
        path: "/auto-correction",
        name: "Avtomatik bahoni to'g'rilash",
        component: () => import("@/views/pages/auto-correction.vue"), // SEPARATE FILE
        meta: { requiredLevel: "rais" },
      },
      // Add new Plausible debug route
      {
        path: "/collect-data",
        name: "Ma'lumot yig'ish",
        component: () => import("@/views/pages/collect-data.vue"),
        meta: { requiredLevel: "rais" },
      },
      // Add library locations route
      {
        path: "/library-locations",
        name: "Kutubxona joylashuvlari",
        component: () => import("@/views/pages/library-locations.vue"),
        meta: { requiredLevel: "rais" },
      },
    ],
  },
  {
    path: "/landing",
    name: "landing",
    component: () => import("@/views/pages/Landing.vue"),
  },
  {
    path: "/pages/notfound",
    name: "notfound",
    component: () => import("@/views/pages/NotFound.vue"),
  },
  {
    path: "/auth/login",
    name: "login",
    component: () => import("@/views/pages/auth/Login.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/auth/access",
    name: "accessDenied",
    component: () => import("@/views/pages/auth/Access.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/auth/error",
    name: "error",
    component: () => import("@/views/pages/auth/Error.vue"),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Add a global navigation guard
router.beforeEach((to, from, next) => {
  // Check if route requires authentication
  if (to.matched.some((record) => record.meta.requiresAuth !== false)) {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      next({ name: "login" })
      return
    }

    // Check if route requires specific access level
    const requiredLevel = to.meta.requiredLevel
    if (requiredLevel && !authService.hasAccess(requiredLevel)) {
      next({ name: "accessDenied" })
      return
    }
  } else if (to.name === "login" && authService.isAuthenticated()) {
    // Redirect to dashboard if already logged in
    next({ name: "dashboard" })
    return
  }

  // Check if we need to redirect to experts page after admin return
  const redirectToExperts = localStorage.getItem("redirectToExperts")
  if (redirectToExperts === "true") {
    localStorage.removeItem("redirectToExperts")

    // Only redirect if we're not already going to /experts
    if (to.path !== "/experts") {
      next("/experts")
      return
    }
  }

  next()
})

export default router
