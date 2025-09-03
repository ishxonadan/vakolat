const express = require("express")
const fs = require("fs")
const path = require("path")
const router = express.Router()

module.exports = () => {
  // Get list of videos from /rolik folder structure
  router.get("/list", async (req, res) => {
    try {
      console.log("🎬 Scanning /rolik folder for videos...")

      const rolikPath = path.join(__dirname, "../public/rolik")
      const natlibPath = path.join(rolikPath, "natlib")
      const klipPath = path.join(rolikPath, "klip")

      const result = {
        natlib: [],
        klip: [],
      }

      // Supported video formats
      const videoExtensions = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v", ".3gp", ".flv"]

      // Helper function to get video files from directory
      const getVideoFiles = (dirPath) => {
        try {
          if (!fs.existsSync(dirPath)) {
            console.log(`📁 Directory not found: ${dirPath}`)
            return []
          }

          const files = fs.readdirSync(dirPath)
          const videoFiles = files.filter((file) => {
            const ext = path.extname(file).toLowerCase()
            return videoExtensions.includes(ext)
          })

          console.log(`📁 Found ${videoFiles.length} videos in ${path.basename(dirPath)}:`, videoFiles)
          return videoFiles
        } catch (error) {
          console.error(`❌ Error reading directory ${dirPath}:`, error)
          return []
        }
      }

      // Scan natlib folder
      result.natlib = getVideoFiles(natlibPath)

      // Scan klip folder
      result.klip = getVideoFiles(klipPath)

      console.log(`✅ Video scan complete:`)
      console.log(`   - Natlib: ${result.natlib.length} videos`)
      console.log(`   - Klip: ${result.klip.length} videos`)
      console.log(`   - Total: ${result.natlib.length + result.klip.length} videos`)

      // Set appropriate headers
      res.setHeader("Content-Type", "application/json")
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
      res.setHeader("Pragma", "no-cache")
      res.setHeader("Expires", "0")

      res.json(result)
    } catch (error) {
      console.error("❌ Error scanning video folders:", error)
      res.status(500).json({
        error: "Video folder scan failed",
        natlib: [],
        klip: [],
      })
    }
  })

  // Refresh video list (force rescan)
  router.post("/refresh", async (req, res) => {
    try {
      console.log("🔄 Force refreshing video list...")

      // Just redirect to the list endpoint to trigger a fresh scan
      const response = await fetch(`${req.protocol}://${req.get("host")}/api/videos/list`)
      const data = await response.json()

      res.json({
        message: "Video list refreshed",
        ...data,
      })
    } catch (error) {
      console.error("❌ Error refreshing video list:", error)
      res.status(500).json({ error: "Failed to refresh video list" })
    }
  })

  return router
}
