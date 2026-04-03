const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET || "secret_key"
const { collectPermissionNamesFromPopulatedUser } = require("../utils/userPermissionNames")

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" })
  }
  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

// Middleware to check user level hierarchy
const checkUserLevel = (requiredLevel) => {
  return (req, res, next) => {
    verifyToken(req, res, (err) => {
      if (err) return next(err)
      const userLevel = req.user.level || "expert"
      const levels = { rais: 5, admin: 3, moderator: 2, expert: 1, user: 0 }
      if (levels[userLevel] >= levels[requiredLevel]) {
        next()
      } else {
        res.status(403).json({ error: "Insufficient permissions" })
      }
    })
  }
}

/**
 * Middleware to check specific named permissions.
 * User → permissionGroups[] va (eski) permissionGroup — barcha guruhlardan faol huquq nomlari birlashmasi
 * rais level bypasses all permission checks.
 *
 * @param {string[]} requiredPermissions - array of permission name strings
 */
const checkPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    verifyToken(req, res, async (err) => {
      if (err) return next(err)
      try {
        // rais (superadmin) bypasses all checks
        if (req.user.level === "rais") return next()

        const User = req.app.locals.User
        if (!User) {
          return res.status(500).json({ error: "User model not available" })
        }

        const user = await User.findById(req.user.id)
          .populate({
            path: "permissionGroups",
            populate: { path: "permissions", select: "name isActive" },
          })
          .populate({
            path: "permissionGroup",
            populate: { path: "permissions", select: "name isActive" },
          })
          .lean()

        if (!user) {
          return res.status(404).json({ error: "User not found" })
        }

        const userPermissionNames = collectPermissionNamesFromPopulatedUser(user)

        const hasAll = requiredPermissions.every((p) => userPermissionNames.includes(p))

        if (hasAll) {
          // Attach permission names to request for downstream use
          req.userPermissions = userPermissionNames
          next()
        } else {
          res.status(403).json({
            error: "Ruxsat yo'q",
            required: requiredPermissions,
          })
        }
      } catch (error) {
        console.error("Error checking permissions:", error)
        res.status(500).json({ error: "Error checking permissions" })
      }
    })
  }
}

/**
 * User must have at least one of the listed active permissions.
 * rais bypasses.
 *
 * @param {string[]} anyOfPermissions
 */
const checkAnyPermissions = (anyOfPermissions) => {
  return async (req, res, next) => {
    verifyToken(req, res, async (err) => {
      if (err) return next(err)
      try {
        if (req.user.level === "rais") return next()

        const User = req.app.locals.User
        if (!User) {
          return res.status(500).json({ error: "User model not available" })
        }

        const user = await User.findById(req.user.id)
          .populate({
            path: "permissionGroups",
            populate: { path: "permissions", select: "name isActive" },
          })
          .populate({
            path: "permissionGroup",
            populate: { path: "permissions", select: "name isActive" },
          })
          .lean()

        if (!user) {
          return res.status(404).json({ error: "User not found" })
        }

        const userPermissionNames = collectPermissionNamesFromPopulatedUser(user)

        const hasOne = anyOfPermissions.some((p) => userPermissionNames.includes(p))

        if (hasOne) {
          req.userPermissions = userPermissionNames
          next()
        } else {
          res.status(403).json({
            error: "Ruxsat yo'q",
            requiredAny: anyOfPermissions,
          })
        }
      } catch (error) {
        console.error("Error checking permissions:", error)
        res.status(500).json({ error: "Error checking permissions" })
      }
    })
  }
}

module.exports = { verifyToken, checkUserLevel, checkPermissions, checkAnyPermissions }
