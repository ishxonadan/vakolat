const express = require("express")
const router = express.Router()
const { verifyToken } = require("../src/middleware/auth.middleware")

module.exports = function(vakolat) {
  const RatingAssignment = vakolat.model("RatingAssignment")
  const WebsiteRating = vakolat.model("WebsiteRating")
  const Contestant = vakolat.model("Websites")
  
  // Get current user's rating assignments for the current month
  router.get("/assignments", verifyToken, async (req, res) => {
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
      const currentYear = now.getFullYear()
  
      // Find the user's assignments for the current month
      const assignment = await RatingAssignment.findOne({
        userId: req.user.id,
        month: currentMonth,
        year: currentYear,
      }).populate("websiteIds")
  
      // Count how many experts are already assigned for this month
      const expertCount = await RatingAssignment.countDocuments({
        month: currentMonth,
        year: currentYear,
      })
  
      if (!assignment) {
        return res.json({
          assigned: false,
          maxExpertsReached: expertCount >= 3,
        })
      }
  
      // Get ratings for assigned websites
      const ratings = await WebsiteRating.find({
        userId: req.user.id,
        month: currentMonth,
        year: currentYear,
      })
  
      // Map websites with their rating status
      const websites = assignment.websiteIds.map((website) => {
        const rating = ratings.find((r) => r.websiteId.toString() === website._id.toString())
        return {
          _id: website._id,
          name: website.name,
          url: website.url,
          rated: !!rating,
          ratingId: rating ? rating._id : null,
          score: rating ? rating.totalScore : 0,
        }
      })
  
      res.json({
        assigned: true,
        websites,
        completed: assignment.completed,
      })
    } catch (error) {
      console.error("Error fetching rating assignments:", error)
      res.status(500).json({ error: "Failed to fetch rating assignments" })
    }
  })
  
  // Assign websites to the user for rating
  router.post("/assign", verifyToken, async (req, res) => {
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
  
      // Check if user already has assignments for this month
      const existingAssignment = await RatingAssignment.findOne({
        userId: req.user.id,
        month: currentMonth,
        year: currentYear,
      })
  
      if (existingAssignment) {
        return res.status(400).json({ error: "You already have website assignments for this month" })
      }
  
      // Check if the maximum number of experts (3) have already been assigned for this month
      const expertCount = await RatingAssignment.countDocuments({
        month: currentMonth,
        year: currentYear,
      })
  
      if (expertCount >= 3) {
        return res.status(400).json({
          error:
            "Maximum number of experts (3) have already been assigned for this month. No more experts can participate in rating.",
        })
      }
  
      // Get all websites - assign ALL websites to the expert
      const allWebsites = await Contestant.find({})
  
      if (allWebsites.length === 0) {
        return res.status(400).json({ error: "No websites available for rating" })
      }
  
      // Create new assignment with ALL websites
      const assignment = new RatingAssignment({
        userId: req.user.id,
        websiteIds: allWebsites.map((w) => w._id),
        month: currentMonth,
        year: currentYear,
      })
  
      await assignment.save()
  
      // Return the newly created assignment
      const websites = allWebsites.map((website) => ({
        _id: website._id,
        name: website.name,
        url: website.url,
        rated: false,
      }))
  
      res.status(201).json({
        assigned: true,
        websites,
        completed: false,
      })
    } catch (error) {
      console.error("Error assigning websites:", error)
      res.status(500).json({ error: "Failed to assign websites for rating" })
    }
  })
  
  // Get rating criteria
  router.get("/criteria", verifyToken, (req, res) => {
    // Return the rating criteria structure
    const criteria = {
      content: {
        title: "Kutubxona veb-sayt kontentining to'liqliligi",
        items: [
          "Kutubxona raxbariyati xaqida ma'lumot mavjudligi",
          "Kutubxona tarkibiy bo'linmalari mavjudligi",
          "Kutubxona tarixi mavjudligi",
          "Kutubxona vazifalari va funksiyalarining tavsifi",
          "Kutubxona manzili va ishonch telefoni mavjudligi",
        ],
      },
      reliability: {
        title: "Kutubxona veb-saytidan foydalanish ishonchliligi",
        items: [
          "Kutubxona veb sayti axborot xavfsizligi siyosati mavjudligi",
          "Foydalanuvchilarni axborot tizimiga kirishini nazorat qilish",
          "Foydalanuvchilarni shaxsiy kabinetini ximoyalash",
          "Kutubxona ma'lumotlarini ximoyalash",
          "Kutubxona xisobotlarining ximoyalanganligi",
        ],
      },
      usability: {
        title: "Kutubxona veb-sayti kontentining qulayligi",
        items: [
          "Imkoniyati cheklangan shaxslar uchun pandus va boshqa moslamalarning mavjudligi",
          "Foydalanuvchilarni shaxsiy kabinetini ochish va undan foydalanish",
          "Saxifalar navigatsiyasi qulayligi",
          "Sayt xaritasi mavjudligi",
        ],
      },
      search: {
        title: "Veb saytda joylashtirilgan barcha matnli axborot qidruv funksiyasi mavjudligi",
        items: [
          "Qidruv funksiyasi mavjudligi",
          "Yangi adabiyotlarni qidrish",
          "Davriy nashrlarni qidrish",
          "Maqolalarni qidrish",
          "Umumiy matnli axborotlarni qidrish",
        ],
      },
      documents: {
        title: "Normativ xujjatlar tog'risida ma'lumotlar mavjudligi",
        items: [
          "Kutubxona soxasiga tegishli qarorlar",
          "Kutubxona soxasiga tegishli qonunlar",
          "Kutubxona soxasiga tegishli nizomlar",
          "Kutubxona soxasiga tegishli standartlar",
          "Barcha xujjatlarni yuklab olish xizmati",
        ],
      },
      news: {
        title: "Kutubxona yangiliklarning yoritilishi",
        items: [
          "Kutubxona yangiliklar yoritilishi to'liqligi",
          "Kutubxona yangiliklar 1 oyda 8ta yanglikdan yuqori yangilik joylashtirish",
          "Yangiliklar mazmuniga doir rasmlar bilan yoritilishi",
          "O'zbekiston Respublikasida belgilangan bayramlarni nishonlash",
          "Yangiliklarni joylashtirish sanasi mavjudligi",
        ],
      },
      language: {
        title: "Til taminoti mavjudligi",
        items: [
          "Veb sayt matni o'zbek tilida (lotin) yuritilishi",
          "Veb sayt matni o'zbek tilida (kiril) yuritilishi",
          "Veb sayt matni rus tilida yuritilishi",
          "Veb sayt matni inglis tilida yuritilishi",
        ],
      },
      onlineBooks: {
        title: "Online kitoblarni yetkazib berish",
        items: [
          "Online kitoblarni kalit so'z orqali qidirish",
          "To'liq matnini yuklab olish",
          "Kitoblarni shaxsiy kabinetda saqlash",
          "Ommabop kitoblarni ko'rish",
          "Kitoblarni avdio shakli mavjudligi",
        ],
      },
      regionalInfo: {
        title: "Hududiy AKMlar xaqidagi ma'lumotlar to'liqligi",
        items: [
          "Hududiy AKMlar faoliyati xaqida ma'lumot",
          "Hududiy AKMlar raxbarlari xaqida ma'lumot",
          "Hududiy AKMlar bog'lanish manzillari",
          "Hududiy AKMlar veb manzillari",
        ],
      },
      events: {
        title: "Kutubxona tomonidan o'tkaziladigan tadbirlar, kitob ko'zgazmalari xaqidagi ma'lumotlar mavjudligi",
        items: [
          "Kutubxona tadbirlari xaqida ma'lumot",
          "Kutubxona kitob ko'zgazmalari xaqida ma'lumot",
          "Kutubxona tadbirlari e'lonlari xaqida ma'lumot",
          "Mashxur o'zbek adiblari xaqida ma'lumot",
          "Jaxon adiblari xaqida ma'lumot",
        ],
      },
      design: {
        title: "Veb sayt dizayni kutubxonaga moslashtirilganligi",
        items: [
          "Veb sayt dizayni kutubxona xayotiga mosligi",
          "Veb sayt logotivi kutubxonaga mosligi",
          "Saxifalar navigatsiyasi ko'rinish",
          "Xamkor tashkilotlar to'g'risidagi ma'lumotlar logotiv bilan joylashtirish va bog'lanish",
          "Veb-sayt yurtimizda belgilarni bayramlarga mos dizaynda yangilab turish",
        ],
      },
      interactive: {
        title: "Foydalanuvchilarning kutubxona veb-saytga murojatlari (interaktiv so'rovlar)",
        items: [
          '"Kutubxonachidan soʻrang" virtual maʼlumot xizmati',
          "Onlayn maslahat",
          "Hujjatlarni elektron etkazib berish",
          "Kitobni qaytarish muddatini uzaytirish",
          "Foydalanuvchilarga onlayn-axborot berish",
        ],
      },
    }
  
    res.json(criteria)
  })
  
  // Submit rating for a website
  router.post("/website/:websiteId", verifyToken, async (req, res) => {
    try {
      const { websiteId } = req.params
      const { ratings, comments } = req.body
  
      if (!ratings) {
        return res.status(400).json({ error: "Ratings are required" })
      }
  
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
  
      // Check if the website is assigned to the user
      const assignment = await RatingAssignment.findOne({
        userId: req.user.id,
        websiteIds: websiteId,
        month: currentMonth,
        year: currentYear,
      })
  
      if (!assignment) {
        return res.status(400).json({ error: "This website is not assigned to you for rating" })
      }
  
      // Calculate total score
      let totalScore = 0
      Object.values(ratings).forEach((categoryRatings) => {
        categoryRatings.forEach((rating) => {
          if (rating) totalScore++
        })
      })
  
      // Create or update rating
      let rating = await WebsiteRating.findOne({
        userId: req.user.id,
        websiteId,
        month: currentMonth,
        year: currentYear,
      })
  
      if (rating) {
        // Update existing rating
        rating.ratings = ratings
        rating.totalScore = totalScore
        rating.comments = comments
        rating.ratedAt = now
      } else {
        // Create new rating
        rating = new WebsiteRating({
          userId: req.user.id,
          websiteId,
          month: currentMonth,
          year: currentYear,
          ratings,
          totalScore,
          comments,
        })
      }
  
      await rating.save()
  
      // Check if all assigned websites are rated
      const ratedWebsites = await WebsiteRating.countDocuments({
        userId: req.user.id,
        websiteId: { $in: assignment.websiteIds },
        month: currentMonth,
        year: currentYear,
      })
  
      // If all websites are rated, mark the assignment as completed
      if (ratedWebsites === assignment.websiteIds.length) {
        assignment.completed = true
        await assignment.save()
      }
  
      res.json({
        success: true,
        rating: {
          _id: rating._id,
          totalScore,
          ratedAt: rating.ratedAt,
        },
      })
    } catch (error) {
      console.error("Error submitting rating:", error)
      res.status(500).json({ error: "Failed to submit rating" })
    }
  })
  
  // Get rating details for a website
  router.get("/website/:websiteId", verifyToken, async (req, res) => {
    try {
      const { websiteId } = req.params
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
  
      const rating = await WebsiteRating.findOne({
        userId: req.user.id,
        websiteId,
        month: currentMonth,
        year: currentYear,
      })
  
      if (!rating) {
        return res.status(404).json({ error: "Rating not found" })
      }
  
      res.json(rating)
    } catch (error) {
      console.error("Error fetching rating:", error)
      res.status(500).json({ error: "Failed to fetch rating" })
    }
  })

  return router
}

