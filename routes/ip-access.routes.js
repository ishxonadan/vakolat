module.exports = (diss) => {
  const express = require("express")
  const router = express.Router()
  const mongoose = require("mongoose")
  const { verifyToken, checkPermissions } = require("../src/middleware/auth.middleware")

  const ipSchema = new mongoose.Schema(
    {
      startIP: { type: String, required: true },
      endIP: { type: String, required: true },
      description: { type: String, required: true },
      active: { type: String, default: "true" },
    },
    { 
      collection: "ip",
      timestamps: true  // Adds createdAt and updatedAt fields
    },
  )

  const IP = diss.model("IP", ipSchema)

  // Get all IPs with pagination
  router.get("/", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      console.log("IP Access GET request received")

      let page = Number.parseInt(req.query.page, 10)
      let limit = Number.parseInt(req.query.limit, 10)

      if (!Number.isFinite(page) || page < 1) page = 1
      if (!Number.isFinite(limit) || limit < 1) limit = 50
      // Prevent accidental huge limits
      if (limit > 500) limit = 500

      const filter = {}

      // Search filter
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, "i")
        filter.$or = [
          { startIP: searchRegex },
          { endIP: searchRegex },
          { description: searchRegex },
        ]
      }

      console.log("Fetching IPs with filter:", filter)

      // Build sort query - Default: active first, then by newest
      let sort = { active: -1, _id: -1 } // "true" comes before "false" alphabetically when desc
      if (req.query.sortField) {
        sort = { [req.query.sortField]: req.query.sortOrder === "asc" ? 1 : -1 }
      }

      const total = await IP.countDocuments(filter)
      const totalPages = total > 0 ? Math.ceil(total / limit) : 0

      // If client requests page beyond available pages, clamp to last page
      if (totalPages > 0 && page > totalPages) page = totalPages

      const skip = (page - 1) * limit
      const ips = await IP.find(filter).sort(sort).skip(skip).limit(limit).lean()

      console.log(`Found ${ips.length} IPs, total: ${total}`)

      res.json({
        success: true,
        data: ips,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      })
    } catch (error) {
      console.error("Error fetching IPs:", error)
      res.status(500).json({ success: false, message: "Server error", error: error.message })
    }
  })

  // Get single IP by ID
  router.get("/:id", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      const ip = await IP.findById(req.params.id).lean()
      if (!ip) {
        return res.status(404).json({ success: false, message: "IP not found" })
      }
      res.json({ success: true, data: ip })
    } catch (error) {
      console.error("Error fetching IP:", error)
      res.status(500).json({ success: false, message: "Server error" })
    }
  })

  // Create new IP
  router.post("/", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      const { startIP, endIP, description, active } = req.body

      if (!startIP || !endIP || !description) {
        return res.status(400).json({
          success: false,
          message: "startIP, endIP, and description are required",
        })
      }

      const newIP = new IP({
        startIP,
        endIP,
        description,
        active: active || "true",
      })

      await newIP.save()
      res.status(201).json({ success: true, data: newIP })
    } catch (error) {
      console.error("Error creating IP:", error)
      res.status(500).json({ success: false, message: "Server error" })
    }
  })

  // Update IP
  router.put("/:id", verifyToken, checkPermissions(["view_statistics"]), async (req, res) => {
    try {
      const { startIP, endIP, description, active } = req.body

      const updateData = {}
      if (startIP !== undefined) updateData.startIP = startIP
      if (endIP !== undefined) updateData.endIP = endIP
      if (description !== undefined) updateData.description = description
      if (active !== undefined) updateData.active = active

      const updatedIP = await IP.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })

      if (!updatedIP) {
        return res.status(404).json({ success: false, message: "IP not found" })
      }

      res.json({ success: true, data: updatedIP })
    } catch (error) {
      console.error("Error updating IP:", error)
      res.status(500).json({ success: false, message: "Server error" })
    }
  })

  // Toggle active status
  router.patch(
    "/:id/toggle",
    verifyToken,
    checkPermissions(["view_statistics"]),
    async (req, res) => {
      try {
        const ip = await IP.findById(req.params.id)
        if (!ip) {
          return res.status(404).json({ success: false, message: "IP not found" })
        }

        ip.active = ip.active === "true" ? "false" : "true"
        await ip.save()

        res.json({ success: true, data: ip })
      } catch (error) {
        console.error("Error toggling IP status:", error)
        res.status(500).json({ success: false, message: "Server error" })
      }
    },
  )

  return router
}
