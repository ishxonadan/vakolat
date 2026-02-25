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
 * Generic middleware to log authenticated API requests for non-rais users.
 * Logs method, path, query and a redacted body snapshot.
 * Fire-and-forget: never awaits log write, always calls next() once so response is never delayed or double-sent.
 */
const auditRequestMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next()
  }

  const token = authHeader.split(" ")[1]
  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch {
    return next()
  }

  if (shouldSkipUser(decoded)) {
    return next()
  }

  const AuditLog = getAuditModel(req)
  if (!AuditLog) return next()

  const safeBody = { ...(req.body || {}) }
  if (Object.prototype.hasOwnProperty.call(safeBody, "password")) {
    safeBody.password = "***"
  }
  if (Object.prototype.hasOwnProperty.call(safeBody, "newPassword")) {
    safeBody.newPassword = "***"
  }

  const payload = {
    user: decoded.id,
    level: decoded.level,
    action: `${req.method} ${req.path}`,
    entityType: "api",
    entityId: null,
    meta: {
      method: req.method,
      path: req.originalUrl,
      query: req.query,
      body: safeBody,
    },
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  }

  // Fire-and-forget: do not await; call next() immediately so we never block or double-send
  AuditLog.create(payload).catch((err) => console.error("Error writing audit log:", err))
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
  auditRequestMiddleware,
  logExplicitAction,
}

