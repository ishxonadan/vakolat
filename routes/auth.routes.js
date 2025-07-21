const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

// Export a function that takes the vakolat db connection and JWT_SECRET
module.exports = function(vakolat, JWT_SECRET) {
  const User = vakolat.model("User")
  
  class Auth {
    constructor(db) {
      this.UserModel = db.model("User")
    }
  
    authenticate = async (nickname, pass) => {
      const user = await this.UserModel.findOne({ nickname: nickname.toLowerCase() })
      if (user) {
        const match = await bcrypt.compare(pass, user.password)
        return match ? user : false
      }
      return false
    }
  
    generateAccessToken = (user) => {
      return jwt.sign(
        {
          id: user._id,
          nickname: user.nickname,
          level: user.level,
          firstname: user.firstname,
          lastname: user.lastname,
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      )
    }
  }
  
  const auth = new Auth(vakolat)
  
  // Authentication endpoint
  router.post(["/auth", "/api/auth"], async (req, res) => {
    const { nickname, password } = req.body
    if (!nickname || !password) {
      res.status(401).send("Login yoki parol ko'rsatilmadi")
      return
    }
  
    const user = await auth.authenticate(nickname, password)
    if (user) {
      const token = auth.generateAccessToken(user)
      res.status(200).send({
        token,
        user: {
          id: user._id,
          nickname: user.nickname,
          firstname: user.firstname,
          lastname: user.lastname,
          level: user.level,
        },
        status: "ok",
      })
    } else {
      res.status(403).send({
        status: "Noto'g'ri login yoki parol",
      })
    }
  })
  
  // Protected route to get current user info
  router.get("/api/me", verifyToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id, "-password")
      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }
      res.json(user)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
  
  // Register a new user (admin only)
  router.post("/api/admin/register", checkUserLevel("admin"), async (req, res) => {
    try {
      const { nickname, password, firstname, lastname, position, level, language } = req.body
  
      // Validate required fields
      if (!firstname || !lastname || !password) {
        return res.status(400).json({ error: "All fields are required" })
      }
  
      const hashedPassword = await bcrypt.hash(password, 10)
  
      const user = new User({
        nickname,
        password: hashedPassword,
        firstname,
        lastname,
        position,
        level: level || "expert",
        language: language || "uz",
      })
  
      await user.save()
      res.status(201).json({ message: "User registered successfully" })
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })
  
  // Get users - protected with admin level check
  router.get("/api/users", checkUserLevel("admin"), async (req, res) => {
    try {
      // Fetch all users from the database (excluding passwords)
      const userList = await User.find({}, "-password")
      res.json(userList)
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve users." })
    }
  })
  
  return router
}