const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET || "secret_key"

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
 * Traverses: User → permissionGroup → permissions[].name
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
            path: "permissionGroup",
            populate: { path: "permissions", select: "name isActive" },
          })
          .lean()

        if (!user) {
          return res.status(404).json({ error: "User not found" })
        }

        // Collect active permission names from the user's group
        const groupPerms = user.permissionGroup?.permissions || []
        const userPermissionNames = groupPerms
          .filter((p) => p.isActive !== false)
          .map((p) => p.name)

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

module.exports = { verifyToken, checkUserLevel, checkPermissions }
