const jwt = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET || "secret_key"

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" })
  }

  const token = authHeader.split(" ")[1]

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET)

    // Add the user info to the request object
    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

// Middleware to check user level
const checkUserLevel = (requiredLevel) => {
  return (req, res, next) => {
    // Verify token first
    verifyToken(req, res, (err) => {
      if (err) return next(err)

      // Get user level from token
      const userLevel = req.user.level || "expert"

      // Define level hierarchy
      const levels = {
        rais: 5,
        admin: 3,
        moderator: 2,
        expert: 1,
        user: 0,
      }

      // Check if user has required level
      if (levels[userLevel] >= levels[requiredLevel]) {
        next()
      } else {
        res.status(403).json({ error: "Insufficient permissions" })
      }
    })
  }
}

// Middleware to check specific permissions
const checkPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    // Verify token first
    verifyToken(req, res, async (err) => {
      if (err) return next(err)

      try {
        // Superadmin (rais) has all permissions
        if (req.user.level === "rais") {
          return next()
        }

        // Get user permissions from database
        const User = req.app.locals.User // Assuming User model is available
        const user = await User.findById(req.user.id).populate("permissions")

        if (!user) {
          return res.status(404).json({ error: "User not found" })
        }

        const userPermissions = user.permissions || []
        const userPermissionNames = userPermissions.map((p) => p.name)

        // Check if user has all required permissions
        const hasAllPermissions = requiredPermissions.every((permission) => userPermissionNames.includes(permission))

        if (hasAllPermissions) {
          next()
        } else {
          res.status(403).json({
            error: "Insufficient permissions",
            required: requiredPermissions,
            userHas: userPermissionNames,
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
