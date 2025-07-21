import authService from "./auth.service"

class ApiService {
  constructor() {
    this.baseURL = "" // Remove the default /api prefix
  }

  async request(endpoint, options = {}) {
    // Add /api prefix if the endpoint doesn't already start with it
    const url = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`

    // Set default headers
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    // Add authorization header if user is authenticated
    if (authService.isAuthenticated()) {
      headers["Authorization"] = `Bearer ${authService.getToken()}`
    }

    const config = {
      ...options,
      headers,
    }

    try {
      console.log(`Making ${options.method || "GET"} request to:`, url)
      const response = await fetch(url, config)

      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        authService.logout()
        window.location.href = "/auth/login"
        return Promise.reject(new Error("Unauthorized"))
      }

      // Parse JSON response
      const data = await response.json()

      if (!response.ok) {
        console.error("API error:", data)
        return Promise.reject(data)
      }

      return data
    } catch (error) {
      console.error("API request failed:", error)
      return Promise.reject(error)
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: "GET" })
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" })
  }
}

export default new ApiService()

