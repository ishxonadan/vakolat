import { createRouter, createWebHistory } from "vue-router"
import AppLayout from "@/layout/AppLayout.vue"
import authService from "@/service/auth.service"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true }, // This ensures the entire layout requires auth
      children: [
        {
          path: "/",
          name: "dashboard",
          component: () => import("@/views/Dashboard.vue"),
        },
        {
          path: "/pages/crud",
          name: "crud",
          component: () => import("@/views/pages/Crud.vue"),
        },
        {
          path: "/pages/empty",
          name: "empty",
          component: () => import("@/views/pages/Empty.vue"),
        },
        {
          path: "/pages/landing",
          name: "landing",
          component: () => import("@/views/pages/Landing.vue"),
        },
        {
          path: "/pages/notfound",
          name: "notfound",
          component: () => import("@/views/pages/NotFound.vue"),
        },
        {
          path: "/documentation",
          name: "documentation",
          component: () => import("@/views/pages/Documentation.vue"),
        },
        // Experts routes
        {
          path: "/vakillar",
          name: "vakillar",
          component: () => import("@/views/pages/vakillar.vue"),
          // meta: { requiredPermissions: ["manage_users"] }, // This ensures the entire layout requires auth
        },
        {
          path: "/vakil_add",
          name: "vakil_add",
          component: () => import("@/views/pages/vakil_add.vue"),
          // meta: { requiredPermissions: ["manage_users"] }, // This ensures the entire layout requires auth
        },
        {
          path: "/vakil_edit/:id",
          name: "vakil_edit",
          component: () => import("@/views/pages/vakil_edit.vue"),
          // meta: { requiredPermissions: ["manage_users"] }, // This ensures the entire layout requires auth
        },
        // Permissions management routes
        {
          path: "/permissions",
          name: "permissions",
          component: () => import("@/views/pages/permissions.vue"),
          meta: { requiredLevel: "rais" },
        },
        {
          path: "/user-permissions",
          name: "user-permissions",
          component: () => import("@/views/pages/user-permissions.vue"),
          meta: { requiredLevel: "rais" },
        },
        // Dissertation routes
        {
          path: "/diss",
          name: "diss",
          component: () => import("@/views/pages/diss.vue"),
          // meta: { requiredPermissions: ["view_dissertations"] }, // This ensures the entire layout requires auth
        },
        {
          path: "/diss_add",
          name: "diss_add",
          component: () => import("@/views/pages/diss_add.vue"),
          // meta: { requiredPermissions: ["manage_dissertations"] }, // This ensures the entire layout requires auth
        },
        {
          path: "/diss_edit/:uuid",
          name: "diss_edit",
          component: () => import("@/views/pages/diss_edit.vue"),
          // meta: { requiredPermissions: ["manage_dissertations"] }, // This ensures the entire layout requires auth
        },
        // Rating routes
        {
          path: "/library-locations",
          name: "library-locations",
          component: () => import("@/views/pages/library-locations.vue"),
        },
        // Data collection
        {
          path: "/collect-data",
          name: "collect-data",
          component: () => import("@/views/pages/collect-data.vue"),
        },
        // Table/Jadval
        {
          path: "/jadval",
          name: "jadval",
          component: () => import("@/views/pages/jadval.vue"),
        },
        // Add page
        {
          path: "/add",
          name: "add",
          component: () => import("@/views/pages/add.vue"),
        },
        // Debug page
        {
          path: "/plausible-debug",
          name: "plausible-debug",
          component: () => import("@/views/pages/plausible-debug.vue"),
          meta: { requiredLevel: "admin" },
        },
        // TICKET ROUTES
        {
          path: "/tickets",
          name: "tickets",
          component: () => import("@/views/pages/tickets.vue"),
        },
        {
          path: "/ticket_add",
          name: "ticket_add",
          component: () => import("@/views/pages/ticket_add.vue"),
        },
        // UI Kit routes
        {
          path: "/uikit/formlayout",
          name: "formlayout",
          component: () => import("@/views/uikit/FormLayout.vue"),
        },
        {
          path: "/uikit/input",
          name: "input",
          component: () => import("@/views/uikit/InputDoc.vue"),
        },
        {
          path: "/uikit/button",
          name: "button",
          component: () => import("@/views/uikit/ButtonDoc.vue"),
        },
        {
          path: "/uikit/table",
          name: "table",
          component: () => import("@/views/uikit/TableDoc.vue"),
        },
        {
          path: "/uikit/list",
          name: "list",
          component: () => import("@/views/uikit/ListDoc.vue"),
        },
        {
          path: "/uikit/tree",
          name: "tree",
          component: () => import("@/views/uikit/TreeDoc.vue"),
        },
        {
          path: "/uikit/panel",
          name: "panel",
          component: () => import("@/views/uikit/PanelsDoc.vue"),
        },
        {
          path: "/uikit/overlay",
          name: "overlay",
          component: () => import("@/views/uikit/OverlayDoc.vue"),
        },
        {
          path: "/uikit/media",
          name: "media",
          component: () => import("@/views/uikit/MediaDoc.vue"),
        },
        {
          path: "/uikit/menu",
          name: "menu",
          component: () => import("@/views/uikit/MenuDoc.vue"),
        },
        {
          path: "/uikit/message",
          name: "message",
          component: () => import("@/views/uikit/MessagesDoc.vue"),
        },
        {
          path: "/uikit/file",
          name: "file",
          component: () => import("@/views/uikit/FileDoc.vue"),
        },
        {
          path: "/uikit/chart",
          name: "chart",
          component: () => import("@/views/uikit/ChartDoc.vue"),
        },
        {
          path: "/uikit/misc",
          name: "misc",
          component: () => import("@/views/uikit/MiscDoc.vue"),
        },
        {
          path: "/uikit/timeline",
          name: "timeline",
          component: () => import("@/views/uikit/TimelineDoc.vue"),
        },
      ],
    },
    // Auth routes (outside of AppLayout) - explicitly set requiresAuth: false
    {
      path: "/auth/login",
      name: "login",
      component: () => import("@/views/pages/auth/Login.vue"), // Your existing Login.vue
      meta: { requiresAuth: false },
    },
    {
      path: "/auth/access",
      name: "accessDenied",
      component: () => import("@/views/pages/auth/Access.vue"), // Your existing Access.vue
      meta: { requiresAuth: false },
    },
    {
      path: "/auth/error",
      name: "error",
      component: () => import("@/views/pages/auth/Error.vue"), // Your existing Error.vue
      meta: { requiresAuth: false },
    },
    // Catch all route - must be last
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: () => import("@/views/pages/NotFound.vue"),
      meta: { requiresAuth: false },
    },
  ],
})

// Add a global navigation guard with extensive debugging
router.beforeEach(async (to, from, next) => {
  console.log("\n" + "=".repeat(50))
  console.log("🚦 ROUTER GUARD - Navigation Event")
  console.log("=".repeat(50))
  console.log("📍 From:", from.path)
  console.log("📍 To:", to.path)
  console.log("📍 Route name:", to.name)
  console.log("📍 Route meta:", to.meta)

  // Check if route requires authentication (default to true unless explicitly set to false)
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth !== false)
  console.log("🔐 Route requires auth:", requiresAuth)

  if (requiresAuth) {
    console.log("🔍 Checking authentication...")

    // Check if user is authenticated
    const isAuthenticated = authService.isAuthenticated()
    console.log("🔍 Is authenticated:", isAuthenticated)

    if (!isAuthenticated) {
      console.log("❌ NOT AUTHENTICATED - Redirecting to login")
      console.log("=".repeat(50) + "\n")
      next({ name: "login" })
      return
    }

    console.log("✅ AUTHENTICATED - Checking permissions...")

    // Check if route requires specific access level
    const requiredLevel = to.meta.requiredLevel
    if (requiredLevel) {
      console.log("🎭 Checking level requirement:", requiredLevel)

      const userLevel = authService.getUserLevel()
      const levels = { rais: 5, admin: 3, moderator: 2, expert: 1, user: 0 }

      console.log("🎭 User level:", userLevel, "(" + levels[userLevel] + ")")
      console.log("🎭 Required level:", requiredLevel, "(" + levels[requiredLevel] + ")")

      if (levels[userLevel] < levels[requiredLevel]) {
        console.log("❌ INSUFFICIENT LEVEL - Redirecting to access denied")
        console.log("=".repeat(50) + "\n")
        next({ name: "accessDenied" })
        return
      }

      console.log("✅ LEVEL CHECK PASSED")
    }

    // Check if route requires specific permissions
    const requiredPermissions = to.meta.requiredPermissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      console.log("🔐 Checking permission requirements:", requiredPermissions)

      try {
        const hasPermission = await authService.hasPermissions(requiredPermissions)
        console.log("🔐 Has required permissions:", hasPermission)

        if (!hasPermission) {
          console.log("❌ INSUFFICIENT PERMISSIONS - Redirecting to access denied")
          console.log("=".repeat(50) + "\n")
          next({ name: "accessDenied" })
          return
        }

        console.log("✅ PERMISSION CHECK PASSED")
      } catch (error) {
        console.error("❌ ERROR CHECKING PERMISSIONS:", error)
        console.log("=".repeat(50) + "\n")
        next({ name: "accessDenied" })
        return
      }
    }
  } else if (to.name === "login" && authService.isAuthenticated()) {
    // Redirect to dashboard if already logged in and trying to access login
    console.log("✅ Already authenticated, redirecting to dashboard")
    console.log("=".repeat(50) + "\n")
    next({ name: "dashboard" })
    return
  }

  // Check if we need to redirect to experts page after admin return
  const redirectToExperts = localStorage.getItem("redirectToExperts")
  if (redirectToExperts === "true") {
    localStorage.removeItem("redirectToExperts")

    // Only redirect if we're not already going to /experts
    if (to.path !== "/experts") {
      console.log("🔄 Redirecting to experts page")
      console.log("=".repeat(50) + "\n")
      next("/experts")
      return
    }
  }

  console.log("✅ NAVIGATION ALLOWED")
  console.log("=".repeat(50) + "\n")
  next()
})

export default router
