const express = require("express")
const router = express.Router()
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat) => {
  const LibraryLocation = vakolat.model("LibraryLocation")
  const Contestant = vakolat.model("Websites")

  // GET all library locations
  router.get("/", checkUserLevel("rais"), async (req, res) => {
    try {
      const locations = await LibraryLocation.find({}).populate("organizationId", "name url").sort({ createdAt: -1 })
      res.status(200).json(locations)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // GET a single library location by ID
  router.get("/:id", checkUserLevel("rais"), async (req, res) => {
    try {
      const location = await LibraryLocation.findById(req.params.id).populate("organizationId", "name url")
      if (!location) {
        return res.status(404).json({ error: "Library location not found" })
      }
      res.status(200).json(location)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST a new library location
  router.post("/", checkUserLevel("rais"), async (req, res) => {
    try {
      const { organizationId, locationCode, locationName, region, apiEndpoint } = req.body

      // Validate required fields
      if (!organizationId || !locationCode || !locationName || !region || !apiEndpoint) {
        return res.status(400).json({ error: "All fields are required" })
      }

      // Check if organization already has a location configured
      const existingLocation = await LibraryLocation.findOne({ organizationId })
      if (existingLocation) {
        return res.status(400).json({ error: "Bu tashkilot uchun joylashuv allaqachon sozlangan" })
      }

      const location = new LibraryLocation({
        organizationId,
        locationCode,
        locationName,
        region,
        apiEndpoint,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await location.save()

      // Populate the organization data for response
      await location.populate("organizationId", "name url")

      res.status(201).json({ message: "Library location added successfully", location })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  // PUT (update) a library location
  router.put("/:id", checkUserLevel("rais"), async (req, res) => {
    try {
      const { organizationId, locationCode, locationName, region, apiEndpoint, isActive } = req.body

      // Validate required fields
      if (!organizationId || !locationCode || !locationName || !region || !apiEndpoint) {
        return res.status(400).json({ error: "All fields are required" })
      }

      const location = await LibraryLocation.findById(req.params.id)
      if (!location) {
        return res.status(404).json({ error: "Library location not found" })
      }

      // Check if another organization already uses this location (if organizationId changed)
      if (organizationId !== location.organizationId.toString()) {
        const existingLocation = await LibraryLocation.findOne({
          organizationId,
          _id: { $ne: req.params.id },
        })
        if (existingLocation) {
          return res.status(400).json({ error: "Bu tashkilot uchun joylashuv allaqachon sozlangan" })
        }
      }

      // Update fields
      location.organizationId = organizationId
      location.locationCode = locationCode
      location.locationName = locationName
      location.region = region
      location.apiEndpoint = apiEndpoint
      location.isActive = isActive !== undefined ? isActive : location.isActive
      location.updatedAt = new Date()

      await location.save()

      // Populate the organization data for response
      await location.populate("organizationId", "name url")

      res.status(200).json({ message: "Library location updated successfully", location })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  // DELETE a library location
  router.delete("/:id", checkUserLevel("rais"), async (req, res) => {
    try {
      const location = await LibraryLocation.findById(req.params.id)
      if (!location) {
        return res.status(404).json({ error: "Library location not found" })
      }

      await LibraryLocation.findByIdAndDelete(req.params.id)
      res.status(200).json({ message: "Library location deleted successfully" })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  // GET organizations without location configuration
  router.get("/available/organizations", checkUserLevel("rais"), async (req, res) => {
    try {
      // Get all organizations
      const allOrganizations = await Contestant.find({}, "_id name url")

      // Get organizations that already have locations configured
      const configuredLocations = await LibraryLocation.find({}, "organizationId")
      const configuredOrgIds = configuredLocations.map((loc) => loc.organizationId.toString())

      // Filter out organizations that already have locations
      const availableOrganizations = allOrganizations.filter((org) => !configuredOrgIds.includes(org._id.toString()))

      res.status(200).json(availableOrganizations)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
