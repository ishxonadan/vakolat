const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")
const {
  normalizePermissionGroupIds,
  mergeLegacyPermissionGroups,
} = require("../src/utils/userPermissionNames")

module.exports = (vakolat, JWT_SECRET) => {
  const User = vakolat.model("User")
  const StaffPosition = vakolat.model("StaffPosition")

  // Get experts - protected with token verification
  router.get("/", verifyToken, async (req, res) => {
    try {
      const expertList = await User.find(
        { level: "expert" },
        "nickname firstname lastname position language isActive permissionGroup permissionGroups staffDepartment staffPosition",
      )
        .populate("permissionGroup", "name _id isActive")
        .populate("permissionGroups", "name _id isActive")
        .populate("staffDepartment", "name _id isActive")
        .populate("staffPosition", "name _id isActive sortOrder")
        .lean()
      expertList.forEach((e) => mergeLegacyPermissionGroups(e))
      res.json(expertList)
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve experts." })
    }
  })

  // Get a single expert by ID
  router.get("/:id", verifyToken, async (req, res) => {
    try {
      const expertId = req.params.id

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        return res.status(400).json({ error: "Invalid expert ID format" })
      }

      // Find the expert by ID (populate permissionGroup for edit form)
      const expert = await User.findById(expertId, "-password")
        .populate("permissionGroup", "name _id isActive")
        .populate("permissionGroups", "name _id isActive")
        .populate("staffDepartment", "name _id isActive")
        .populate("staffPosition", "name _id isActive sortOrder")
        .lean()

      if (!expert) {
        return res.status(404).json({ error: "Expert not found" })
      }

      // Check if the expert has the 'expert' level
      if (expert.level !== "expert") {
        return res.status(400).json({ error: "User is not an expert" })
      }

      mergeLegacyPermissionGroups(expert)
      res.json(expert)
    } catch (error) {
      console.error("Error fetching expert:", error)
      res.status(500).json({ error: "Failed to retrieve expert" })
    }
  })

  // Update an expert
  router.put("/:id", checkUserLevel("admin"), async (req, res) => {
    try {
      const expertId = req.params.id
      const {
        nickname,
        firstname,
        lastname,
        position,
        password,
        language,
        permissionGroup,
        permissionGroups,
        staffDepartment,
        staffPosition,
        isActive,
      } = req.body

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(expertId)) {
        return res.status(400).json({ error: "Invalid expert ID format" })
      }

      // Find the expert
      const expert = await User.findById(expertId)

      if (!expert) {
        return res.status(404).json({ error: "Expert not found" })
      }

      // Update fields
      if (nickname !== undefined) expert.nickname = nickname
      if (firstname !== undefined) expert.firstname = firstname
      if (lastname !== undefined) expert.lastname = lastname
      if (language !== undefined) expert.language = language || "uz"
      if (permissionGroups !== undefined || permissionGroup !== undefined) {
        const src = permissionGroups !== undefined ? permissionGroups : permissionGroup
        const ids = normalizePermissionGroupIds(src)
        expert.permissionGroups = ids
        expert.permissionGroup = ids.length ? ids[0] : null
      }
      if (staffDepartment !== undefined) {
        const raw = staffDepartment ? String(staffDepartment).trim() : ""
        expert.staffDepartment = raw && mongoose.Types.ObjectId.isValid(raw) ? raw : null
      }
      if (staffPosition !== undefined) {
        const raw = staffPosition ? String(staffPosition).trim() : ""
        const newRef = raw && mongoose.Types.ObjectId.isValid(raw) ? raw : null
        const hadRef = !!expert.staffPosition
        expert.staffPosition = newRef
        if (newRef) {
          const sp = await StaffPosition.findById(newRef).select("name").lean()
          expert.position = sp?.name || expert.position || ""
        } else if (hadRef) {
          expert.position = ""
        }
      } else if (position !== undefined) {
        expert.position = position || ""
      }
      if (isActive !== undefined) expert.isActive = isActive !== false

      // Update password if provided
      if (password) {
        expert.password = await bcrypt.hash(password, 10)
      }

      await expert.save()

      // Return the updated expert without password
      const { password: _, ...expertData } = expert.toObject()

      res.json(expertData)
    } catch (error) {
      console.error("Error updating expert:", error)
      res.status(500).json({ error: "Failed to update expert" })
    }
  })

  // Login as expert (for superadmins only)
  router.post("/login-as-expert", checkUserLevel("rais"), async (req, res) => {
    try {
      const { expertId } = req.body

      if (!expertId) {
        return res.status(400).json({ error: "Expert ID is required" })
      }

      // Find the expert
      const expert = await User.findById(expertId)
      if (!expert) {
        return res.status(404).json({ error: "Expert not found" })
      }

      // Generate token for the expert
      const token = jwt.sign(
        {
          id: expert._id,
          nickname: expert.nickname,
          level: expert.level,
          firstname: expert.firstname,
          lastname: expert.lastname,
          impersonatedBy: req.user.id, // Add this to track who is impersonating
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      )

      res.status(200).json({
        token,
        user: {
          id: expert._id,
          nickname: expert.nickname,
          firstname: expert.firstname,
          lastname: expert.lastname,
          level: expert.level,
        },
      })
    } catch (error) {
      console.error("Error logging in as expert:", error)
      res.status(500).json({ error: "Failed to login as expert" })
    }
  })

  return router
}

