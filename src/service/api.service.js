const API_BASE_URL = process.env.NODE_ENV === "production" ? "" : "http://localhost:7777"

// Helper function to handle 401 errors
const handleUnauthorized = () => {
  // Import auth service and router dynamically to avoid circular dependencies
  import('./auth.service').then(({ default: authService }) => {
    authService.logout()
  })
  
  // Redirect to login page
  window.location.href = '/auth/login'
}

const ApiService = {
  async get(endpoint, options = {}) {
    const token = localStorage.getItem("token")
    
    // Build query string if params are provided
    let url = `${API_BASE_URL}/api${endpoint}`
    if (options.params) {
      const queryParams = new URLSearchParams()
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value)
        }
      })
      const queryString = queryParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (response.status === 401) {
      handleUnauthorized()
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Network error")
    }

    return await response.json()
  },

  async post(endpoint, data) {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    })

    if (response.status === 401) {
      handleUnauthorized()
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Network error")
    }

    return await response.json()
  },

  async put(endpoint, data) {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    })

    if (response.status === 401) {
      handleUnauthorized()
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Network error")
    }

    return await response.json()
  },

  async delete(endpoint) {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (response.status === 401) {
      handleUnauthorized()
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Network error")
    }

    return await response.json()
  },

  async patch(endpoint, data) {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (response.status === 401) {
      handleUnauthorized()
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Network error")
    }

    return await response.json()
  },
}

export default ApiService
