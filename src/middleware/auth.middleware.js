const jwt = require("jsonwebtoken")
const JWT_SECRET = "secret_key" // Should be in environment variables in production

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

      // Get user from database to check current level
      // This is a simplified example - in a real app, you'd query the database
      const userLevel = req.user.level || "expert" // Default to expert if not specified

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

module.exports = { verifyToken, checkUserLevel }

