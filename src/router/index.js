import { createRouter, createWebHistory } from "vue-router"
import AppLayout from "@/layout/AppLayout.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
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
          path: "/experts",
          name: "experts",
          component: () => import("@/views/pages/experts.vue"),
        },
        {
          path: "/expert_add",
          name: "expert_add",
          component: () => import("@/views/pages/expert_add.vue"),
        },
        {
          path: "/expert_edit/:id",
          name: "expert_edit",
          component: () => import("@/views/pages/expert_edit.vue"),
        },
        // Contestants routes
        {
          path: "/contestants",
          name: "contestants",
          component: () => import("@/views/pages/contestants.vue"),
        },
        {
          path: "/contestant_add",
          name: "contestant_add",
          component: () => import("@/views/pages/contestant_add.vue"),
        },
        {
          path: "/contestant_edit/:id",
          name: "contestant_edit",
          component: () => import("@/views/pages/contestant_edit.vue"),
        },
        // Dissertation routes
        {
          path: "/diss",
          name: "diss",
          component: () => import("@/views/pages/diss.vue"),
        },
        {
          path: "/diss_add",
          name: "diss_add",
          component: () => import("@/views/pages/diss_add.vue"),
        },
        {
          path: "/diss_edit/:uuid",
          name: "diss_edit",
          component: () => import("@/views/pages/diss_edit.vue"),
        },
        // Rating routes
        {
          path: "/rate",
          name: "rate",
          component: () => import("@/views/pages/rate.vue"),
        },
        {
          path: "/rate-website",
          name: "rate-website",
          component: () => import("@/views/pages/rate-website.vue"),
        },
        {
          path: "/rating-results",
          name: "rating-results",
          component: () => import("@/views/pages/rating-results.vue"),
        },
        // Evaluation routes
        {
          path: "/auto-evaluation",
          name: "auto-evaluation",
          component: () => import("@/views/pages/auto-evaluation.vue"),
        },
        {
          path: "/user-evaluation",
          name: "user-evaluation",
          component: () => import("@/views/pages/user-evaluation.vue"),
        },
        {
          path: "/auto-correction",
          name: "auto-correction",
          component: () => import("@/views/pages/auto-correction.vue"),
        },
        {
          path: "/user-correction",
          name: "user-correction",
          component: () => import("@/views/pages/user-correction.vue"),
        },
        // Library locations
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
        },
        // NEW TICKET ROUTES
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
        {
          path: "/uikit/menu",
          name: "menu",
          component: () => import("@/views/uikit/MenuDoc.vue"),
        },
      ],
    },
    // Auth routes (outside of AppLayout)
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
    // Catch all route - must be last
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: () => import("@/views/pages/NotFound.vue"),
    },
  ],
})

export default router
