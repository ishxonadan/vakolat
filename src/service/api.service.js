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
  async get(endpoint) {
    const token = localStorage.getItem("token")
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
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
}

export default ApiService
