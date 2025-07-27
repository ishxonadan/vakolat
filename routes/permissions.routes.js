const express = require("express")
const mongoose = require("mongoose")
const router = express.Router()
const { verifyToken, checkUserLevel } = require("../src/middleware/auth.middleware")

module.exports = (vakolat, JWT_SECRET) => {
  // Permission schema - use mongoose.Schema instead of vakolat.Schema
  const permissionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })

  // Permission Group schema - use mongoose.Schema instead of vakolat.Schema
  const permissionGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })

  const Permission = vakolat.model("Permission", permissionSchema)
  const PermissionGroup = vakolat.model("PermissionGroup", permissionGroupSchema)

  // Middleware to check if user is rais (superadmin)
  const requireRais = [verifyToken, checkUserLevel("rais")]

  // GET all permissions
  router.get("/permissions", requireRais, async (req, res) => {
    try {
      const permissions = await Permission.find().sort({ createdAt: -1 })
      res.json(permissions)
    } catch (error) {
      console.error("Error fetching permissions:", error)
      res.status(500).json({ error: "Huquqlarni yuklashda xatolik" })
    }
  })

  // GET permission by ID
  router.get("/permissions/:id", requireRais, async (req, res) => {
    try {
      const permission = await Permission.findById(req.params.id)
      if (!permission) {
        return res.status(404).json({ error: "Huquq topilmadi" })
      }
      res.json(permission)
    } catch (error) {
      console.error("Error fetching permission:", error)
      res.status(500).json({ error: "Huquqni yuklashda xatolik" })
    }
  })

  // POST create new permission
  router.post("/permissions", requireRais, async (req, res) => {
    try {
      const { name, description, isActive = true } = req.body

      if (!name || !description) {
        return res.status(400).json({ error: "Huquq nomi va tavsifi talab qilinadi" })
      }

      // Check if permission with same name already exists
      const existingPermission = await Permission.findOne({ name: name.trim() })
      if (existingPermission) {
        return res.status(400).json({ error: "Bu nomli huquq allaqachon mavjud" })
      }

      const permission = new Permission({
        name: name.trim(),
        description: description.trim(),
        isActive,
      })

      await permission.save()
      res.status(201).json(permission)
    } catch (error) {
      console.error("Error creating permission:", error)
      if (error.code === 11000) {
        res.status(400).json({ error: "Bu nomli huquq allaqachon mavjud" })
      } else {
        res.status(500).json({ error: "Huquqni yaratishda xatolik" })
      }
    }
  })

  // PUT update permission
  router.put("/permissions/:id", requireRais, async (req, res) => {
    try {
      const { name, description, isActive } = req.body

      if (!name || !description) {
        return res.status(400).json({ error: "Huquq nomi va tavsifi talab qilinadi" })
      }

      // Check if another permission with same name exists
      const existingPermission = await Permission.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      })
      if (existingPermission) {
        return res.status(400).json({ error: "Bu nomli huquq allaqachon mavjud" })
      }

      const permission = await Permission.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),
          description: description.trim(),
          isActive,
          updatedAt: new Date(),
        },
        { new: true },
      )

      if (!permission) {
        return res.status(404).json({ error: "Huquq topilmadi" })
      }

      res.json(permission)
    } catch (error) {
      console.error("Error updating permission:", error)
      if (error.code === 11000) {
        res.status(400).json({ error: "Bu nomli huquq allaqachon mavjud" })
      } else {
        res.status(500).json({ error: "Huquqni yangilashda xatolik" })
      }
    }
  })

  // DELETE permission
  router.delete("/permissions/:id", requireRais, async (req, res) => {
    try {
      // Check if permission is used in any permission groups
      const groupsUsingPermission = await PermissionGroup.find({
        permissions: req.params.id,
      })

      if (groupsUsingPermission.length > 0) {
        return res.status(400).json({
          error: "Bu huquq guruhlar tomonidan ishlatilmoqda. Avval guruhlardan olib tashlang.",
        })
      }

      const permission = await Permission.findByIdAndDelete(req.params.id)
      if (!permission) {
        return res.status(404).json({ error: "Huquq topilmadi" })
      }

      res.json({ message: "Huquq muvaffaqiyatli o'chirildi" })
    } catch (error) {
      console.error("Error deleting permission:", error)
      res.status(500).json({ error: "Huquqni o'chirishda xatolik" })
    }
  })

  // GET all permission groups
  router.get("/permission-groups", requireRais, async (req, res) => {
    try {
      const groups = await PermissionGroup.find().populate("permissions").sort({ createdAt: -1 })
      res.json(groups)
    } catch (error) {
      console.error("Error fetching permission groups:", error)
      res.status(500).json({ error: "Huquq guruhlarini yuklashda xatolik" })
    }
  })

  // GET permission group by ID
  router.get("/permission-groups/:id", requireRais, async (req, res) => {
    try {
      const group = await PermissionGroup.findById(req.params.id).populate("permissions")
      if (!group) {
        return res.status(404).json({ error: "Huquq guruhi topilmadi" })
      }
      res.json(group)
    } catch (error) {
      console.error("Error fetching permission group:", error)
      res.status(500).json({ error: "Huquq guruhini yuklashda xatolik" })
    }
  })

  // POST create new permission group
  router.post("/permission-groups", requireRais, async (req, res) => {
    try {
      const { name, description, permissions = [], isActive = true } = req.body

      if (!name || !description) {
        return res.status(400).json({ error: "Guruh nomi va tavsifi talab qilinadi" })
      }

      // Check if group with same name already exists
      const existingGroup = await PermissionGroup.findOne({ name: name.trim() })
      if (existingGroup) {
        return res.status(400).json({ error: "Bu nomli guruh allaqachon mavjud" })
      }

      // Validate that all permission IDs exist
      if (permissions.length > 0) {
        const validPermissions = await Permission.find({
          _id: { $in: permissions },
          isActive: true,
        })
        if (validPermissions.length !== permissions.length) {
          return res.status(400).json({ error: "Ba'zi huquqlar topilmadi yoki faol emas" })
        }
      }

      const group = new PermissionGroup({
        name: name.trim(),
        description: description.trim(),
        permissions,
        isActive,
      })

      await group.save()

      // Populate permissions before returning
      await group.populate("permissions")

      res.status(201).json(group)
    } catch (error) {
      console.error("Error creating permission group:", error)
      if (error.code === 11000) {
        res.status(400).json({ error: "Bu nomli guruh allaqachon mavjud" })
      } else {
        res.status(500).json({ error: "Huquq guruhini yaratishda xatolik" })
      }
    }
  })

  // PUT update permission group
  router.put("/permission-groups/:id", requireRais, async (req, res) => {
    try {
      const { name, description, permissions = [], isActive } = req.body

      if (!name || !description) {
        return res.status(400).json({ error: "Guruh nomi va tavsifi talab qilinadi" })
      }

      // Check if another group with same name exists
      const existingGroup = await PermissionGroup.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      })
      if (existingGroup) {
        return res.status(400).json({ error: "Bu nomli guruh allaqachon mavjud" })
      }

      // Validate that all permission IDs exist
      if (permissions.length > 0) {
        const validPermissions = await Permission.find({
          _id: { $in: permissions },
          isActive: true,
        })
        if (validPermissions.length !== permissions.length) {
          return res.status(400).json({ error: "Ba'zi huquqlar topilmadi yoki faol emas" })
        }
      }

      const group = await PermissionGroup.findByIdAndUpdate(
        req.params.id,
        {
          name: name.trim(),
          description: description.trim(),
          permissions,
          isActive,
          updatedAt: new Date(),
        },
        { new: true },
      ).populate("permissions")

      if (!group) {
        return res.status(404).json({ error: "Huquq guruhi topilmadi" })
      }

      res.json(group)
    } catch (error) {
      console.error("Error updating permission group:", error)
      if (error.code === 11000) {
        res.status(400).json({ error: "Bu nomli guruh allaqachon mavjud" })
      } else {
        res.status(500).json({ error: "Huquq guruhini yangilashda xatolik" })
      }
    }
  })

  // DELETE permission group
  router.delete("/permission-groups/:id", requireRais, async (req, res) => {
    try {
      // Check if group is assigned to any users
      const User = vakolat.model("User")
      const usersWithGroup = await User.find({ permissionGroup: req.params.id })

      if (usersWithGroup.length > 0) {
        return res.status(400).json({
          error: "Bu guruh foydalanuvchilar tomonidan ishlatilmoqda. Avval foydalanuvchilardan olib tashlang.",
        })
      }

      const group = await PermissionGroup.findByIdAndDelete(req.params.id)
      if (!group) {
        return res.status(404).json({ error: "Huquq guruhi topilmadi" })
      }

      res.json({ message: "Huquq guruhi muvaffaqiyatli o'chirildi" })
    } catch (error) {
      console.error("Error deleting permission group:", error)
      res.status(500).json({ error: "Huquq guruhini o'chirishda xatolik" })
    }
  })

  return router
}
