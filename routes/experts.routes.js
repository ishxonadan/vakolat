const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat, JWT_SECRET) => {
  const User = vakolat.model("User")

  // Get experts - protected with token verification
  router.get("/", verifyToken, async (req, res) => {
    try {
      // Fetch experts with selected fields only (excluding password)
      const expertList = await User.find(
        { level: "expert" },
        "nickname firstname lastname position language", // Only select these fields
      )
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

      // Find the expert by ID
      const expert = await User.findById(expertId, "-password") // Exclude password

      if (!expert) {
        return res.status(404).json({ error: "Expert not found" })
      }

      // Check if the expert has the 'expert' level
      if (expert.level !== "expert") {
        return res.status(400).json({ error: "User is not an expert" })
      }

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
      const { nickname, firstname, lastname, position, password, language } = req.body

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
      expert.nickname = nickname
      expert.firstname = firstname
      expert.lastname = lastname
      expert.position = position || ""
      expert.language = language || "uz"

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

