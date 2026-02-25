const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "secret_key"

const getAuditModel = (req) => {
  return req.app.locals.AuditLog
}

const shouldSkipUser = (user) => {
  if (!user) return true
  // Do not log superuser (rais) actions as requested
  if (user.level === "rais") return true
  return false
}

/**
 * Attach a post-response audit hook for authenticated API requests (non-rais users).
 * Called once per request; logs after the response has been sent (res.on('finish')).
 */
const attachApiAudit = (req, res, next) => {
  const AuditLog = getAuditModel(req)
  if (!AuditLog) return next()

  const startedAt = Date.now()

  res.on("finish", () => {
    try {
      // Skip if response is not from API handler (defensive) or is auth login/logout (handled explicitly)
      if (!req.path.startsWith("/api/") || req.path.startsWith("/api/auth")) {
        return
      }

      let actor = req.user || null

      // If route didn't populate req.user (e.g. uses only verifyToken inside middleware),
      // try to decode JWT directly from Authorization header.
      if (!actor) {
        const authHeader = req.headers.authorization
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1]
          try {
            actor = jwt.verify(token, JWT_SECRET)
          } catch {
            actor = null
          }
        }
      }

      if (shouldSkipUser(actor)) {
        return
      }

      const safeBody = { ...(req.body || {}) }
      if (Object.prototype.hasOwnProperty.call(safeBody, "password")) {
        safeBody.password = "***"
      }
      if (Object.prototype.hasOwnProperty.call(safeBody, "newPassword")) {
        safeBody.newPassword = "***"
      }

      // Default generic action + entity
      let action = `${req.method} ${req.path}`
      let entityType = "api"
      let entityId = null

      // Semantic mapping for important dissertation actions
      if (req.path.startsWith("/api/diss_save")) {
        entityType = "dissertation"
        const pathParts = req.path.split("/")
        const pathUuid = pathParts.length > 3 ? pathParts[3] : null
        const bodyUuid = safeBody.uuid
        entityId = pathUuid || bodyUuid || null

        if (req.method === "POST") {
          if (pathUuid) {
            // Edit existing dissertation; check is_deleted toggle
            if (typeof safeBody.is_deleted !== "undefined") {
              action = safeBody.is_deleted ? "disable_dissertation" : "enable_dissertation"
            } else {
              action = "edit_dissertation"
            }
          } else {
            // New dissertation
            action = "add_dissertation"
          }
        }
      } else if (req.path.startsWith("/api/diss_list")) {
        entityType = "dissertation"
        action = "view_dissertation_list"
      } else if (req.path.startsWith("/api/diss_info")) {
        entityType = "dissertation"
        const parts = req.path.split("/")
        const uuid = parts.length > 3 ? parts[3] : null
        entityId = uuid || null
        action = "view_dissertation_detail"
      }

      const payload = {
        user: actor.id || actor._id,
        level: actor.level,
        action,
        entityType,
        entityId,
        meta: {
          method: req.method,
          path: req.originalUrl,
          query: req.query,
          body: safeBody,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        },
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }

      AuditLog.create(payload).catch((err) => console.error("Error writing audit log:", err))
    } catch (error) {
      console.error("Error writing API audit log:", error)
    }
  })

  next()
}

/**
 * Explicit audit helper for semantic events like login/logout.
 * Can optionally receive a user object (e.g. from auth) instead of req.user.
 */
const logExplicitAction = async (req, userOverride, { action, entityType, entityId, meta }) => {
  try {
    const actor = userOverride || req.user
    if (shouldSkipUser(actor)) return

    const AuditLog = getAuditModel(req)
    if (!AuditLog) return

    await AuditLog.create({
      user: actor.id || actor._id,
      level: actor.level,
      action,
      entityType,
      entityId: entityId ? String(entityId) : undefined,
      meta: meta || {},
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    })
  } catch (error) {
    console.error("Error writing explicit audit log:", error)
  }
}

module.exports = {
  attachApiAudit,
  logExplicitAction,
}

