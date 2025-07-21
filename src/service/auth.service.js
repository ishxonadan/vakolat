import { jwtDecode } from "jwt-decode"

class AuthService {
  constructor() {
    this.token = localStorage.getItem("token") || null
    this.user = null

    // Initialize user from token if it exists
    if (this.token) {
      try {
        this.user = this.parseToken(this.token)
      } catch (error) {
        console.error("Invalid token:", error)
        this.logout()
      }
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

  setToken(token) {
    this.token = token
    localStorage.setItem("token", token)
    this.user = this.parseToken(token)
    localStorage.setItem("auth", "true")
  }

  getToken() {
    return this.token
  }

  isAuthenticated() {
    if (!this.token) return false

    try {
      const decoded = this.parseToken(this.token)
      const currentTime = Date.now() / 1000

      // Check if token is expired
      return decoded && decoded.exp > currentTime
    } catch (error) {
      return false
    }
  }

  getUserLevel() {
    return this.user?.level || null
  }

  getUser() {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  }

  hasAccess(requiredLevel) {
    // Simple level-based authorization
    // This can be expanded with more complex permission logic
    const userLevel = this.getUserLevel()

    if (!userLevel) return false

    const levels = {
      rais: 3,
      admin: 2,
      expert: 1,
      user: 0,
    }

    return levels[userLevel] >= levels[requiredLevel]
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
      localStorage.setItem("user", JSON.stringify(originalUser))
      localStorage.setItem("token", originalUser.token)
      localStorage.removeItem("isImpersonating")
      localStorage.removeItem("originalUser")
      return true
    }
    return false
  }

  logout() {
    this.token = null
    this.user = null
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("auth")
    localStorage.removeItem("isImpersonating")
    localStorage.removeItem("originalUser")
  }
}

export default new AuthService()

