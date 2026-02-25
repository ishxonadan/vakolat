const express = require("express")
const router = express.Router()
const { checkUserLevel } = require("../src/middleware/auth.middleware")
const jwt = require("jsonwebtoken")
const PlausibleService = require("../src/services/plausible.service")

module.exports = (vakolat, JWT_SECRET, PlausibleCache) => {
  const RatingAssignment = vakolat.model("RatingAssignment")
  const WebsiteRating = vakolat.model("WebsiteRating")
  const Contestant = vakolat.model("Websites")
  const User = vakolat.model("User")
  const AutoRating = vakolat.model("AutoRating")
  const SurveyVote = vakolat.model("SurveyVote")

  // Initialize Plausible service
  const plausibleService = new PlausibleService()

  // FIXED: Better domain extraction function
  function extractDomain(url) {
    if (!url) return ""

    let domain = url.toLowerCase()

    // Remove protocol if present
    domain = domain.replace(/^https?:\/\//, "")

    // Remove www if present
    domain = domain.replace(/^www\./, "")

    // Remove path (everything after first slash)
    domain = domain.split("/")[0]

    // Remove port if present
    domain = domain.split(":")[0]

    return domain
  }

  // FIXED: Better domain matching function
  function domainsMatch(url1, url2) {
    const domain1 = extractDomain(url1)
    const domain2 = extractDomain(url2)

    console.log(`Comparing domains: "${domain1}" vs "${domain2}"`)

    return domain1 === domain2
  }

  // FIXED: So'rovnoma score calculation with proper scaling
  async function calculateSorovnomaScore(websiteUrl, month, year) {
    try {
      const websiteDomain = extractDomain(websiteUrl)
      console.log(`Calculating so'rovnoma score for domain: ${websiteDomain}, month: ${month}, year: ${year}`)

      // Create date range for the selected month
      const startDate = new Date(year, month - 1, 1) // month - 1 because JS months are 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59, 999) // Last day of the month

      console.log(`Date range: ${startDate} to ${endDate}`)

      // Find so'rovnoma votes for this domain in the selected month
      // FIXED: Also check for votes with www prefix
      const sorovnomaVotes = await SurveyVote.find({
        $or: [
          { domain: websiteDomain },
          { domain: `www.${websiteDomain}` },
          { domain: websiteDomain.replace(/^www\./, "") },
        ],
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })

      console.log(`Found ${sorovnomaVotes.length} so'rovnoma votes for ${websiteDomain}`)

      if (sorovnomaVotes.length > 0) {
        console.log(
          `So'rovnoma votes found:`,
          sorovnomaVotes.map((v) => ({
            domain: v.domain,
            responses: v.responses,
            total: v.responses.usability + v.responses.design + v.responses.search,
          })),
        )
      }

      if (sorovnomaVotes.length === 0) {
        return { score: 0, count: 0 }
      }

      // Calculate total points from all votes
      let totalPoints = 0
      sorovnomaVotes.forEach((vote) => {
        const voteTotal = vote.responses.usability + vote.responses.design + vote.responses.search
        totalPoints += voteTotal
        console.log(
          `Vote: usability=${vote.responses.usability}, design=${vote.responses.design}, search=${vote.responses.search}, total=${voteTotal}`,
        )
      })

      // Calculate average score per vote (max 15 points per vote: 5+5+5)
      const averageScore = totalPoints / sorovnomaVotes.length
      console.log(`Average score: ${averageScore} (from ${totalPoints} total points, ${sorovnomaVotes.length} votes)`)

      // FIXED: Direct mapping to 15-point scale (with precision)
      const scaledScore = Math.round(averageScore * 10) / 10 // Keep one decimal place

      console.log(`Final score: ${scaledScore} (average: ${averageScore}, direct mapping to 15-point scale)`)

      return { score: scaledScore, count: sorovnomaVotes.length }
    } catch (error) {
      console.error(`Error calculating so'rovnoma score for ${websiteUrl}:`, error)
      return { score: 0, count: 0 }
    }
  }

  // Get admin endpoint to check ratings
  router.get("/ratings", checkUserLevel("admin"), async (req, res) => {
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // Get all assignments for the current month
      const assignments = await RatingAssignment.find({
        month: currentMonth,
        year: currentYear,
      }).populate("userId", "nickname firstname lastname")

      // Count total experts assigned
      const expertCount = assignments.length

      res.json({
        month: currentMonth,
        year: currentYear,
        expertCount,
        maxExpertsReached: expertCount >= 3,
        experts: assignments.map((a) => ({
          id: a.userId._id,
          nickname: a.userId.nickname,
          name: `${a.userId.firstname} ${a.userId.lastname}`,
          completed: a.completed,
          assignedAt: a.assignedAt,
        })),
      })
    } catch (error) {
      console.error("Error fetching admin ratings:", error)
      res.status(500).json({ error: "Failed to fetch admin ratings data" })
    }
  })

  // Endpoint for superadmin to view aggregated ratings
  router.get("/ratings/results", checkUserLevel("rais"), async (req, res) => {
    try {
      const now = new Date()
      const month = req.query.month ? Number.parseInt(req.query.month) : now.getMonth() + 1
      const year = req.query.year ? Number.parseInt(req.query.year) : now.getFullYear()

      // Get all websites
      const websites = await Contestant.find({})

      // Get all ratings for the specified month and year
      const allRatings = await WebsiteRating.find({
        month: month,
        year: year,
      }).populate("userId", "nickname firstname lastname")

      // Get all experts who participated in rating
      const experts = await User.find(
        {
          level: "expert",
          _id: { $in: [...new Set(allRatings.map((r) => r.userId._id))] },
        },
        "nickname firstname lastname",
      )

      // Group ratings by website
      const websiteResults = []

      for (const website of websites) {
        // Get ratings for this website
        const websiteRatings = allRatings.filter((r) => r.websiteId.toString() === website._id.toString())

        // Calculate total score and average
        let totalScore = 0
        const raters = []

        for (const rating of websiteRatings) {
          totalScore += rating.totalScore
          raters.push({
            id: rating.userId._id,
            name: `${rating.userId.firstname} ${rating.userId.lastname}`,
            nickname: rating.userId.nickname,
            score: rating.totalScore,
          })
        }

        // Calculate average score (out of total possible)
        // Each expert can give a maximum of 52 points (updated from 60)
        const maxPossibleScore = 52 // per expert
        const totalMaxScore = maxPossibleScore * 3 // for 3 experts

        // Calculate percentage score with one decimal place
        const averageScore =
          websiteRatings.length > 0 ? ((totalScore / (websiteRatings.length * maxPossibleScore)) * 100).toFixed(1) : 0

        // Calculate final score (out of total possible from 3 experts)
        const finalScore = ((totalScore / totalMaxScore) * 100).toFixed(1)

        websiteResults.push({
          _id: website._id,
          name: website.name,
          url: website.url,
          totalScore: totalScore,
          averageScore: averageScore,
          finalScore: finalScore,
          raterCount: websiteRatings.length,
          fullyRated: websiteRatings.length === 3,
          raters: raters,
        })
      }

      // Sort by fully rated (desc) and then by final score (desc)
      websiteResults.sort((a, b) => {
        if (b.fullyRated !== a.fullyRated) return b.fullyRated ? 1 : -1
        return Number.parseFloat(b.finalScore) - Number.parseFloat(a.finalScore)
      })

      // Get summary statistics
      const fullyRatedCount = websiteResults.filter((w) => w.fullyRated).length
      const partiallyRatedCount = websiteResults.filter((w) => w.raterCount > 0 && !w.fullyRated).length
      const notRatedCount = websiteResults.filter((w) => w.raterCount === 0).length

      res.json({
        month,
        year,
        websites: websiteResults,
        experts,
        stats: {
          totalWebsites: websites.length,
          fullyRatedCount,
          partiallyRatedCount,
          notRatedCount,
        },
      })
    } catch (error) {
      console.error("Error fetching rating results:", error)
      res.status(500).json({ error: "Failed to fetch rating results" })
    }
  })

  // Endpoint for the jadval page to get overall ratings (FIXED with admin override logic)
  router.get("/ratings/overall", checkUserLevel("rais"), async (req, res) => {
    try {
      const now = new Date()
      const month = req.query.month ? Number.parseInt(req.query.month) : now.getMonth() + 1
      const year = req.query.year ? Number.parseInt(req.query.year) : now.getFullYear()

      console.log(`Fetching overall ratings for ${month}/${year}`)

      // Get all websites/organizations
      const organizations = await Contestant.find({})
      console.log(`Found ${organizations.length} organizations`)

      // Get expert ratings for the specified month and year
      const expertRatings = await WebsiteRating.find({
        month: month,
        year: year,
      }).populate("userId", "nickname firstname lastname")

      console.log(`Found ${expertRatings.length} expert ratings`)

      // Get automatic ratings (if they exist)
      let autoRatings = []
      try {
        autoRatings = await AutoRating.find({
          month: month,
          year: year,
        })
        console.log(`Found ${autoRatings.length} auto ratings`)
      } catch (error) {
        console.log("AutoRating model not found, continuing without automatic ratings")
      }

      // Get user ratings (if they exist)
      let userRatings = []
      try {
        const UserRating = vakolat.model("UserRating")
        userRatings = await UserRating.find({
          month: month,
          year: year,
        })
        console.log(`Found ${userRatings.length} user ratings`)
      } catch (error) {
        console.log("UserRating model not found, continuing without user ratings")
      }

      // Get all so'rovnoma votes to check what's available
      const allSorovnomaVotes = await SurveyVote.find({})
      console.log(`Total so'rovnoma votes in database: ${allSorovnomaVotes.length}`)

      // Log unique domains in so'rovnoma votes
      const uniqueDomains = [...new Set(allSorovnomaVotes.map((vote) => vote.domain))]
      console.log(`Unique domains in so'rovnoma votes: ${uniqueDomains.join(", ")}`)

      // Log organization domains for comparison
      const orgDomains = organizations.map((org) => extractDomain(org.url))
      console.log(`Organization domains: ${orgDomains.join(", ")}`)

      // FIXED: Better domain matching analysis
      console.log("\n=== DOMAIN MATCHING ANALYSIS ===")
      organizations.forEach((org) => {
        const orgDomain = extractDomain(org.url)
        const matchingVotes = allSorovnomaVotes.filter((vote) => {
          const voteDomain = extractDomain(vote.domain)
          return voteDomain === orgDomain
        })
        console.log(`${org.name} (${org.url}) -> domain: ${orgDomain} -> votes: ${matchingVotes.length}`)
        if (matchingVotes.length > 0) {
          matchingVotes.forEach((vote) => {
            console.log(
              `  - Vote from: ${vote.domain} (${vote.responses.usability + vote.responses.design + vote.responses.search} points)`,
            )
          })
        }
      })
      console.log("=== END DOMAIN MATCHING ===\n")

      // Get previous month's data for trend calculation
      let previousMonth = month - 1
      let previousYear = year
      if (previousMonth === 0) {
        previousMonth = 12
        previousYear = year - 1
      }

      // Get previous expert ratings
      const previousExpertRatings = await WebsiteRating.find({
        month: previousMonth,
        year: previousYear,
      })

      // Prepare the results
      const results = {
        month,
        year,
        organizations: [],
      }

      // Process each organization
      for (const org of organizations) {
        console.log(`\nProcessing organization: ${org.name} (${org.url})`)
        const orgDomain = extractDomain(org.url)
        console.log(`Organization domain: ${orgDomain}`)

        // Calculate expert score (scale from 60 to 52)
        const orgExpertRatings = expertRatings.filter((r) => r.websiteId.toString() === org._id.toString())
        let expertScore = 0
        if (orgExpertRatings.length > 0) {
          const totalScore = orgExpertRatings.reduce((sum, rating) => sum + rating.totalScore, 0)
          const averageScore = totalScore / orgExpertRatings.length
          // Scale from 60-point system to 52-point system
          expertScore = Math.round((averageScore / 60) * 52)
          console.log(
            `Expert score: ${expertScore} (from ${orgExpertRatings.length} ratings, average: ${averageScore})`,
          )
        }

        // Calculate auto score using Plausible data or existing manual data
        let autoScore = 0
        let autoScoreSource = "none"

        // First check if there's existing manual auto rating
        const orgAutoRating = autoRatings.find(
          (r) => r.organizationId && r.organizationId.toString() === org._id.toString(),
        )

        if (orgAutoRating) {
          autoScore = orgAutoRating.totalScore
          autoScoreSource = "manual"
          console.log(`Auto score: ${autoScore} (from manual entry)`)
        } else {
          // Try to get from Plausible with library integration
          try {
            const plausibleMetrics = await plausibleService.getWebsiteMetrics(
              org.url,
              month,
              year,
              PlausibleCache,
              org._id, // Pass organization ID for library lookup
              Contestant, // Pass Contestant model instead of LibraryLocation
            )
            autoScore = plausibleService.calculatePoints(plausibleMetrics)
            autoScoreSource = "plausible"
            console.log(`Auto score: ${autoScore} (from Plausible data with library integration)`, plausibleMetrics)

            // Optionally save to AutoRating for future reference
            if (autoScore > 0) {
              const newAutoRating = new AutoRating({
                organizationId: org._id,
                month,
                year,
                metrics: plausibleMetrics,
                totalScore: autoScore,
                source: "comprehensive",
              })
              await newAutoRating.save()
              console.log(`Saved comprehensive data to AutoRating for ${org.name}`)
            }
          } catch (error) {
            console.log(`Failed to get comprehensive data for ${org.name}:`, error.message)
            autoScore = 0
            autoScoreSource = "error"
          }
        }

        // FIXED: Admin override logic for user scores
        const orgUserRating = userRatings.find(
          (r) => r.organizationId && r.organizationId.toString() === org._id.toString(),
        )

        let userScore = 0
        let userScoreSource = "none"
        let sorovnomaCount = 0

        if (orgUserRating && orgUserRating.totalScore > 0) {
          // Admin evaluation exists - use it (override so'rovnoma)
          userScore = orgUserRating.totalScore
          userScoreSource = "admin"
          console.log(`User score: ${userScore} (from admin evaluation - overriding any so'rovnoma votes)`)
        } else {
          // No admin evaluation - use so'rovnoma score if available
          const sorovnomaResult = await calculateSorovnomaScore(org.url, month, year)
          if (sorovnomaResult.score > 0) {
            userScore = sorovnomaResult.score
            sorovnomaCount = sorovnomaResult.count
            userScoreSource = "sorovnoma"
            console.log(`User score: ${userScore} (from so'rovnoma votes, ${sorovnomaCount} participants)`)
          } else {
            console.log(`User score: 0 (no admin evaluation or so'rovnoma votes)`)
          }
        }

        // Calculate total score (expert + auto + user)
        const totalScore = expertScore + autoScore + userScore
        console.log(`Total score: ${totalScore}`)

        // Calculate previous expert score for trend
        const prevOrgExpertRatings = previousExpertRatings.filter((r) => r.websiteId.toString() === org._id.toString())
        let prevExpertScore = 0
        if (prevOrgExpertRatings.length > 0) {
          const prevTotalScore = prevOrgExpertRatings.reduce((sum, rating) => sum + rating.totalScore, 0)
          const prevAverageScore = prevTotalScore / prevOrgExpertRatings.length
          prevExpertScore = Math.round((prevAverageScore / 60) * 52)
        }

        // Calculate trend (simple comparison with previous month)
        const trend = expertScore - prevExpertScore

        // Add to results
        results.organizations.push({
          id: org._id,
          name: org.name,
          url: org.url,
          expertScore,
          autoScore,
          autoScoreSource, // Track the source for display
          userScore, // Final user score (either admin or so'rovnoma)
          userScoreSource, // Track the source for display
          sorovnomaCount, // Number of so'rovnoma participants
          totalScore,
          trend,
        })
      }

      // Sort by total score (descending)
      results.organizations.sort((a, b) => b.totalScore - a.totalScore)

      console.log(`\nReturning results for ${results.organizations.length} organizations`)
      res.json(results)
    } catch (error) {
      console.error("Error fetching overall ratings:", error)
      res.status(500).json({ error: "Failed to fetch overall ratings" })
    }
  })

  // NEW: Endpoint to manually trigger Plausible data fetch for all organizations
  router.post("/fetch-plausible-data", checkUserLevel("rais"), async (req, res) => {
    try {
      const { month, year, forceRefresh } = req.body
      const targetMonth = month || new Date().getMonth() + 1
      const targetYear = year || new Date().getFullYear()

      console.log(`Fetching Plausible data for all organizations (${targetMonth}/${targetYear})`)

      const organizations = await Contestant.find({})
      const results = []

      for (const org of organizations) {
        try {
          // Force refresh cache if requested
          if (forceRefresh) {
            await PlausibleCache.deleteOne({
              siteId: plausibleService.extractSiteId(org.url),
              month: targetMonth,
              year: targetYear,
            })
          }

          const metrics = await plausibleService.getWebsiteMetrics(
            org.url,
            targetMonth,
            targetYear,
            PlausibleCache,
            org._id, // Pass organization ID
            Contestant, // Pass Contestant model instead of LibraryLocation
          )
          const score = plausibleService.calculatePoints(metrics)

          // Save or update AutoRating
          await AutoRating.findOneAndUpdate(
            {
              organizationId: org._id,
              month: targetMonth,
              year: targetYear,
            },
            {
              organizationId: org._id,
              month: targetMonth,
              year: targetYear,
              metrics,
              totalScore: score,
              source: "comprehensive",
              updatedAt: new Date(),
            },
            { upsert: true, new: true },
          )

          results.push({
            organization: org.name,
            url: org.url,
            metrics,
            score,
            status: "success",
          })

          console.log(`✓ Processed ${org.name}: ${score} points`)
        } catch (error) {
          console.error(`✗ Failed to process ${org.name}:`, error.message)
          results.push({
            organization: org.name,
            url: org.url,
            error: error.message,
            status: "error",
          })
        }
      }

      res.json({
        success: true,
        month: targetMonth,
        year: targetYear,
        processed: results.length,
        results,
      })
    } catch (error) {
      console.error("Error fetching Plausible data:", error)
      res.status(500).json({ error: "Failed to fetch Plausible data" })
    }
  })

  // NEW: Comprehensive data collection endpoint
  router.post("/collect-all-data", checkUserLevel("rais"), async (req, res) => {
    try {
      const { month, year, forceRefresh, options } = req.body
      const targetMonth = month || new Date().getMonth() + 1
      const targetYear = year || new Date().getFullYear()

      console.log(`Collecting all data for ${targetMonth}/${targetYear}`, options)

      const organizations = await Contestant.find({})
      const results = []
      const stats = {
        successful: 0,
        failed: 0,
        plausibleCount: 0,
        bbsCount: 0,
        libraryCount: 0,
      }

      for (const org of organizations) {
        let result = {
          organization: org.name,
          url: org.url,
          status: "success",
          sources: {
            plausible: false,
            bbs: false,
            library: false,
            manual: false,
          },
          metrics: {
            visitCount: 0,
            pageVisits: 0,
            interactiveServiceUsage: 0,
            personalAccountCount: 0,
            electronicResourceCount: 0,
            newsViewCount: 0,
            electronicResourceUsage: 0,
          },
          score: 0,
        }

        try {
          // Check if manual data already exists
          const existingAutoRating = await AutoRating.findOne({
            organizationId: org._id,
            month: targetMonth,
            year: targetYear,
          })

          if (existingAutoRating && !options.manual) {
            // Use existing manual data
            result.metrics = existingAutoRating.metrics
            result.score = existingAutoRating.totalScore
            result.sources.manual = true
            console.log(`Using existing manual data for ${org.name}`)
          } else {
            // Collect new data from various sources
            // Force refresh cache if requested
            if (forceRefresh) {
              await PlausibleCache.deleteOne({
                siteId: plausibleService.extractSiteId(org.url),
                month: targetMonth,
                year: targetYear,
              })
            }

            const metrics = await plausibleService.getWebsiteMetrics(
              org.url,
              targetMonth,
              targetYear,
              PlausibleCache,
              org._id, // Pass organization ID for library lookup
              Contestant, // Pass Contestant model instead of LibraryLocation
            )

            // Determine which sources were used
            if (options.plausible && (metrics.visitCount > 0 || metrics.pageVisits > 0)) {
              result.sources.plausible = true
              stats.plausibleCount++
            }

            if (options.bbs && metrics.interactiveServiceUsage > 0) {
              result.sources.bbs = true
              stats.bbsCount++
            }

            if (metrics.personalAccountCount > 0) {
              result.sources.library = true
              stats.libraryCount++
            }

            // Calculate total score
            const totalScore = plausibleService.calculatePoints(metrics)
            result.metrics = metrics
            result.score = totalScore

            // Save or update AutoRating
            await AutoRating.findOneAndUpdate(
              {
                organizationId: org._id,
                month: targetMonth,
                year: targetYear,
              },
              {
                organizationId: org._id,
                month: targetMonth,
                year: targetYear,
                metrics,
                totalScore: totalScore,
                source: "comprehensive",
                updatedAt: new Date(),
              },
              { upsert: true, new: true },
            )
          }

          stats.successful++
          console.log(`✓ Processed ${org.name}: ${result.score} points`)
        } catch (error) {
          console.error(`✗ Failed to process ${org.name}:`, error.message)
          result = {
            organization: org.name,
            url: org.url,
            error: error.message,
            status: "error",
            sources: {},
            metrics: {},
            score: 0,
          }
          stats.failed++
        }

        // Always push the result (either success or error)
        results.push(result)
      }

      res.json({
        success: true,
        month: targetMonth,
        year: targetYear,
        processed: results.length,
        stats,
        results,
      })
    } catch (error) {
      console.error("Error collecting comprehensive data:", error)
      res.status(500).json({ error: "Failed to collect comprehensive data" })
    }
  })

  // Endpoint to save automatic evaluation (updated to handle both manual and Plausible data)
  router.post("/auto-evaluation", checkUserLevel("rais"), async (req, res) => {
    try {
      const { organizationId, month, year, metrics } = req.body

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID is required" })
      }

      // Calculate total score based on metrics using the service
      const totalScore = plausibleService.calculatePoints(metrics)

      // Find existing rating or create new one
      let autoRating = await AutoRating.findOne({
        organizationId,
        month,
        year,
      })

      if (autoRating) {
        // Update existing rating
        autoRating.metrics = metrics
        autoRating.totalScore = totalScore
        autoRating.source = "manual"
        autoRating.updatedAt = new Date()
        await autoRating.save()
      } else {
        // Create new rating
        autoRating = new AutoRating({
          organizationId,
          month,
          year,
          metrics,
          totalScore,
          source: "manual",
        })
        await autoRating.save()
      }

      res.status(200).json({
        success: true,
        autoRating,
      })
    } catch (error) {
      console.error("Error saving automatic evaluation:", error)
      res.status(500).json({ error: "Failed to save automatic evaluation" })
    }
  })

  // Login as expert (for superadmins only) – returns token, user, and expert's permissions for menu
  router.post("/login-as-expert", checkUserLevel("rais"), async (req, res) => {
    try {
      const { expertId } = req.body

      if (!expertId) {
        return res.status(400).json({ error: "Expert ID is required" })
      }

      const expert = await User.findById(expertId)
        .populate({ path: "permissionGroup", populate: { path: "permissions", select: "name isActive" } })
        .lean()

      if (!expert) {
        return res.status(404).json({ error: "Expert not found" })
      }

      const token = jwt.sign(
        {
          id: expert._id,
          nickname: expert.nickname,
          level: expert.level,
          firstname: expert.firstname,
          lastname: expert.lastname,
          impersonatedBy: req.user.id,
        },
        JWT_SECRET,
        { expiresIn: "1h" },
      )

      const groupPerms = expert.permissionGroup?.permissions || []
      const permissions = groupPerms.filter((p) => p.isActive !== false).map((p) => p.name)

      res.status(200).json({
        token,
        user: {
          id: expert._id,
          nickname: expert.nickname,
          firstname: expert.firstname,
          lastname: expert.lastname,
          level: expert.level,
        },
        permissions,
      })
    } catch (error) {
      console.error("Error logging in as expert:", error)
      res.status(500).json({ error: "Failed to login as expert" })
    }
  })

  // Add this endpoint to handle user evaluations
  router.post("/user-evaluation", checkUserLevel("rais"), async (req, res) => {
    try {
      const { organizationId, month, year, metrics } = req.body

      if (!organizationId) {
        return res.status(400).json({ error: "Organization ID is required" })
      }

      // Calculate total score (sum of all metrics)
      const totalScore = Object.values(metrics).reduce((sum, value) => sum + value, 0)

      // Find the UserRating model
      const UserRating = vakolat.model("UserRating")

      // Find existing rating or create new one
      let userRating = await UserRating.findOne({
        organizationId,
        month,
        year,
      })

      if (userRating) {
        // Update existing rating
        userRating.metrics = metrics
        userRating.totalScore = totalScore
        userRating.updatedAt = new Date()
        await userRating.save()
      } else {
        // Create new rating
        userRating = new UserRating({
          organizationId,
          month,
          year,
          metrics,
          totalScore,
        })
        await userRating.save()
      }

      res.status(200).json({
        success: true,
        userRating,
      })
    } catch (error) {
      console.error("Error saving user evaluation:", error)
      res.status(500).json({ error: "Failed to save user evaluation" })
    }
  })

  // Enhanced debug endpoint to check so'rovnoma votes and domain matching
  router.get("/debug/survey-votes", checkUserLevel("rais"), async (req, res) => {
    try {
      const { domain, month, year } = req.query

      const query = {}
      if (domain) {
        query.domain = domain
      }

      if (month && year) {
        const startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
        const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0, 23, 59, 59, 999)
        query.createdAt = { $gte: startDate, $lte: endDate }
      }

      const votes = await SurveyVote.find(query).sort({ createdAt: -1 })

      // Also get organization domains for comparison
      const organizations = await Contestant.find({})
      const orgDomains = organizations.map((org) => ({
        name: org.name,
        url: org.url,
        domain: extractDomain(org.url),
      }))

      // Get unique so'rovnoma domains
      const allVotes = await SurveyVote.find({})
      const sorovnomaDomains = [...new Set(allVotes.map((vote) => vote.domain))]

      // FIXED: Better domain matching analysis
      const domainMatches = orgDomains.map((org) => {
        const orgDomain = org.domain
        const matchingVotes = allVotes.filter((vote) => {
          const voteDomain = extractDomain(vote.domain)
          return voteDomain === orgDomain
        })

        return {
          organization: org.name,
          orgDomain: orgDomain,
          orgUrl: org.url,
          hasVotes: matchingVotes.length > 0,
          voteCount: matchingVotes.length,
          matchingDomains: [...new Set(matchingVotes.map((v) => v.domain))],
          totalScore: matchingVotes.reduce(
            (sum, vote) => sum + vote.responses.usability + vote.responses.design + vote.responses.search,
            0,
          ),
          averageScore:
            matchingVotes.length > 0
              ? matchingVotes.reduce(
                  (sum, vote) => sum + vote.responses.usability + vote.responses.design + vote.responses.search,
                  0,
                ) / matchingVotes.length
              : 0,
        }
      })

      res.json({
        totalVotes: votes.length,
        query,
        dateRange:
          month && year
            ? {
                start: new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1),
                end: new Date(Number.parseInt(year), Number.parseInt(month), 0, 23, 59, 59, 999),
              }
            : null,
        organizationDomains: orgDomains,
        sorovnomaDomains: sorovnomaDomains,
        domainMatches: domainMatches,
        votes: votes.map((vote) => ({
          domain: vote.domain,
          extractedDomain: extractDomain(vote.domain),
          responses: vote.responses,
          totalScore: vote.responses.usability + vote.responses.design + vote.responses.search,
          createdAt: vote.createdAt,
          fingerprint: vote.fingerprint?.substring(0, 8) + "...", // Partial fingerprint for privacy
        })),
      })
    } catch (error) {
      console.error("Error fetching so'rovnoma votes:", error)
      res.status(500).json({ error: "Failed to fetch so'rovnoma votes" })
    }
  })

  // NEW: Debug endpoint for Plausible cache
  router.get("/debug/plausible-cache", checkUserLevel("rais"), async (req, res) => {
    try {
      const { siteId, month, year } = req.query

      const query = {}
      if (siteId) query.siteId = siteId
      if (month) query.month = Number.parseInt(month)
      if (year) query.year = Number.parseInt(year)

      const cacheEntries = await PlausibleCache.find(query).sort({ lastUpdated: -1 })

      res.json({
        totalEntries: cacheEntries.length,
        query,
        cacheSettings: {
          useCache: plausibleService.useCache,
          cacheHours: plausibleService.cacheHours,
        },
        entries: cacheEntries.map((entry) => ({
          siteId: entry.siteId,
          month: entry.month,
          year: entry.year,
          metrics: entry.metrics,
          lastUpdated: entry.lastUpdated,
          ageHours: ((new Date() - entry.lastUpdated) / (1000 * 60 * 60)).toFixed(1),
        })),
      })
    } catch (error) {
      console.error("Error fetching Plausible cache:", error)
      res.status(500).json({ error: "Failed to fetch Plausible cache" })
    }
  })

  return router
}
