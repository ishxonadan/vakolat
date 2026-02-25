import { jwtDecode } from "jwt-decode"

const API_BASE_URL = process.env.NODE_ENV === "production" ? "" : "http://localhost:7777"

class AuthService {
  constructor() {
    this.user = null
    this.token = null
    this.permissions = []
    this.loadFromStorage()
  }

  loadFromStorage() {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")
    const permissions = localStorage.getItem("permissions")

    console.log("🔍 Loading from storage:")
    console.log("  - Token exists:", !!token)
    console.log("  - User exists:", !!user)
    console.log("  - Token value:", token ? token.substring(0, 20) + "..." : "null")
    console.log("  - User value:", user)

    if (token && user && token !== "null" && user !== "null") {
      try {
        this.token = token
        this.user = JSON.parse(user)
        this.permissions = permissions ? JSON.parse(permissions) : []
        console.log("✅ Auth data loaded successfully")
        console.log("  - User object:", this.user)
        console.log("  - User level:", this.user?.level)
      } catch (error) {
        console.error("❌ Error parsing stored auth data:", error)
        this.clearStorage()
      }
    } else {
      console.log("❌ No valid auth data in storage")
    }
  }

  parseToken(token) {
    try {
      return jwtDecode(token)
    } catch (error) {
      console.error("Error decoding token:", error)
      return null
    }
  }

  clearStorage() {
    console.log("🧹 Clearing auth storage")
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("permissions")
    localStorage.removeItem("auth")
    localStorage.removeItem("isImpersonating")
    localStorage.removeItem("originalUser")
    this.user = null
    this.token = null
    this.permissions = []
  }

  setToken(token) {
    console.log("🔑 Setting token:", token ? token.substring(0, 20) + "..." : "null")
    this.token = token
    localStorage.setItem("token", token)
    localStorage.setItem("auth", "true")

    // Parse user data from token
    const userData = this.parseToken(token)
    if (userData) {
      this.user = userData
      localStorage.setItem("user", JSON.stringify(userData))
      console.log("👤 User data extracted from token:", userData)
    }
  }

  setUser(user) {
    console.log("👤 Setting user:", user)
    this.user = user
    localStorage.setItem("user", JSON.stringify(user))
  }

  getToken() {
    return this.token
  }

  getUser() {
    return this.user
  }

  isAuthenticated() {
    if (!this.token) {
      console.log("❌ No token found")
      return false
    }

    try {
      const decoded = this.parseToken(this.token)
      const currentTime = Date.now() / 1000

      const isValid = decoded && decoded.exp > currentTime
      const hasUser = !!(this.user && (this.user.id || this.user._id || this.user.nickname))

      console.log("🔍 Authentication check:")
      console.log("  - Token valid:", isValid)
      console.log("  - User valid:", hasUser)
      console.log("  - Token expires:", decoded ? new Date(decoded.exp * 1000) : "N/A")
      console.log("  - Current time:", new Date())
      console.log("  - Final result:", isValid && hasUser)

      if (!isValid) {
        console.log("❌ Token expired or invalid, clearing storage")
        this.clearStorage()
        return false
      }

      return isValid && hasUser
    } catch (error) {
      console.error("❌ Token validation error:", error)
      this.clearStorage()
      return false
    }
  }

  getUserLevel() {
    const level = this.user?.level || "expert"
    console.log("🎭 User level:", level)
    return level
  }

  getPermissions() {
    return this.permissions || []
  }

  hasPermission(permission) {
    if (this.getUserLevel() === "rais") {
      return true
    }
    const perms = this.getPermissions()
    return perms.includes(permission)
  }

  hasPermissions(requiredPermissions) {
    if (!requiredPermissions || requiredPermissions.length === 0) return true
    if (this.getUserLevel() === "rais") {
      return true
    }
    const perms = this.getPermissions()
    return requiredPermissions.every((p) => perms.includes(p))
  }

  hasAccess(requiredLevel) {
    const userLevel = this.getUserLevel()
    if (!userLevel) return false

    const levels = {
      rais: 3,
      admin: 2,
      expert: 1,
      user: 0,
    }

    const result = levels[userLevel] >= levels[requiredLevel]
    console.log(`🎭 Access check: ${userLevel} >= ${requiredLevel} = ${result}`)
    return result
  }

  hasLevel(requiredLevel) {
    const levels = { rais: 5, admin: 3, moderator: 2, expert: 1, user: 0 }
    const userLevel = this.getUserLevel()
    const result = levels[userLevel] >= levels[requiredLevel]

    console.log(
      `🎭 Level check: ${userLevel} (${levels[userLevel]}) >= ${requiredLevel} (${levels[requiredLevel]}) = ${result}`,
    )

    return result
  }

  getFullName() {
    if (!this.user) return ""
    return `${this.user.firstname} ${this.user.lastname}`.trim()
  }

  isImpersonating() {
    return localStorage.getItem("isImpersonating") === "true"
  }

  getOriginalUser() {
    const userStr = localStorage.getItem("originalUser")
    return userStr ? JSON.parse(userStr) : null
  }

  returnToOriginalUser() {
    const originalUser = this.getOriginalUser()
    if (originalUser) {
      console.log("🔄 Returning to original user:", originalUser)

      // Restore original user's token and data
      this.setToken(originalUser.token)
      if (originalUser.user) {
        this.setUser(originalUser.user)
      }

      // Clear impersonation flags
      localStorage.removeItem("isImpersonating")
      localStorage.removeItem("originalUser")

      return true
    }
    return false
  }

  async login(email, password) {
    console.log("🔐 Attempting login for:", email)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname: email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("❌ Login failed:", data.error || data)
        return { success: false, error: data.error || data || "Login failed" }
      }

      if (data.token && data.user) {
        console.log("✅ Login successful, setting auth data")
        this.setToken(data.token)
        this.setUser(data.user)

        // Always set permissions from server (array of permission names for menu/API)
        this.permissions = Array.isArray(data.permissions) ? data.permissions : []
        localStorage.setItem("permissions", JSON.stringify(this.permissions))

        console.log("✅ Auth data stored successfully")
        return { success: true, user: data.user }
      } else {
        console.error("❌ Invalid response format:", data)
        return { success: false, error: "Invalid response format" }
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      return { success: false, error: error.message || "Network error" }
    }
  }

  async logout() {
    console.log("🚪 Logging out")
    try {
      const token = this.getToken()
      if (token) {
        const API_BASE_URL = process.env.NODE_ENV === "production" ? "" : "http://localhost:7777"
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {})
      }
    } finally {
      this.clearStorage()
    }
  }
}

export default new AuthService()
