const express = require("express")
const router = express.Router()
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat) => {
  const Contestant = vakolat.model("Websites")

  // GET all contestants
  router.get("/", verifyToken, async (req, res) => {
    try {
      const contestants = await Contestant.find({}).sort({ createdAt: -1 })
      res.status(200).json(contestants)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // GET a single contestant by ID
  router.get("/:id", verifyToken, async (req, res) => {
    try {
      const contestant = await Contestant.findById(req.params.id)
      if (!contestant) {
        return res.status(404).json({ error: "Contestant not found" })
      }
      res.status(200).json(contestant)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST a new contestant
  router.post("/", checkUserLevel("moderator"), async (req, res) => {
    try {
      const { name, url, libraryConfig } = req.body

      // Validate required fields
      if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" })
      }

      const contestant = new Contestant({
        name,
        url,
        libraryConfig: libraryConfig || {
          locationCode: "",
          locationName: "",
          region: "",
          apiEndpoint: "",
          isActive: false,
        },
        createdAt: new Date(),
        lastEdited: new Date(),
      })

      await contestant.save()
      res.status(201).json({ message: "Contestant added successfully", contestant })
    } catch (err) {
      // Check if this is a duplicate key error
      if (err.message.includes("allaqachon ro'yxatdan o'tgan")) {
        return res.status(400).json({ error: "Bu URL manzili allaqachon ro'yxatdan o'tgan" })
      }
      res.status(400).json({ error: err.message })
    }
  })

  // PUT (update) a contestant
  router.put("/:id", checkUserLevel("moderator"), async (req, res) => {
    try {
      const { name, url, libraryConfig } = req.body

      // Validate required fields
      if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" })
      }

      const contestant = await Contestant.findById(req.params.id)
      if (!contestant) {
        return res.status(404).json({ error: "Contestant not found" })
      }

      // Check if URL is being changed and if it already exists
      if (url !== contestant.url) {
        const existingWithUrl = await Contestant.findOne({ url, _id: { $ne: req.params.id } })
        if (existingWithUrl) {
          return res.status(400).json({ error: "Bu URL manzili allaqachon ro'yxatdan o'tgan" })
        }
      }

      // Update fields
      contestant.name = name
      contestant.url = url
      contestant.libraryConfig = libraryConfig ||
        contestant.libraryConfig || {
          locationCode: "",
          locationName: "",
          region: "",
          apiEndpoint: "",
          isActive: false,
        }
      contestant.lastEdited = new Date()

      await contestant.save()
      res.status(200).json({ message: "Contestant updated successfully", contestant })
    } catch (err) {
      // Check if this is a duplicate key error
      if (err.message.includes("allaqachon ro'yxatdan o'tgan")) {
        return res.status(400).json({ error: "Bu URL manzili allaqachon ro'yxatdan o'tgan" })
      }
      res.status(400).json({ error: err.message })
    }
  })

  // DELETE a contestant
  router.delete("/:id", checkUserLevel("moderator"), async (req, res) => {
    try {
      const contestant = await Contestant.findById(req.params.id)
      if (!contestant) {
        return res.status(404).json({ error: "Contestant not found" })
      }

      await Contestant.findByIdAndDelete(req.params.id)
      res.status(200).json({ message: "Contestant deleted successfully" })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  return router
}
