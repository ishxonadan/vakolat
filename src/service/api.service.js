const API_BASE_URL = process.env.NODE_ENV === "production" ? "" : "http://localhost:7777"

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

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Network error")
    }

    return await response.json()
  },
}

export default ApiService
