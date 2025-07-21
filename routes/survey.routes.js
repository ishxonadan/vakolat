const express = require("express")
const crypto = require("crypto")
const router = express.Router()

module.exports = (vakolat) => {
  const SurveyVote = vakolat.model("SurveyVote")
  const Contestant = vakolat.model("Websites")
  const WebsiteRating = vakolat.model("WebsiteRating")
  const AutoRating = vakolat.model("AutoRating")

  // Try to get UserRating model (might not exist)
  let UserRating = null
  try {
    UserRating = vakolat.model("UserRating")
  } catch (error) {
    console.log("UserRating model not found, continuing without user ratings")
  }

  // Anti-cheat configuration
  const ANTI_CHEAT_CONFIG = {
    DOMAIN_COOLDOWN_MINUTES: 1, // 15 minutes cooldown per domain per fingerprint
    MAX_DAILY_VOTES_PER_DOMAIN: 1, // Max 3 votes per domain per fingerprint per day
    MAX_TOTAL_DAILY_VOTES: 50, // Max 20 total votes per fingerprint per day (across all domains)
    SUSPICIOUS_DAILY_THRESHOLD: 500, // Flag as suspicious if more than 50 votes per day
  }

  // Create browser fingerprint from request headers
  function createFingerprint(req) {
    const components = [
      req.headers["user-agent"] || "",
      req.headers["accept-language"] || "",
      req.headers["accept-encoding"] || "",
      req.headers["accept"] || "",
      // Add more headers that are relatively stable but not privacy-invasive
    ].filter(Boolean)

    const fingerprintString = components.join("|")
    return crypto.createHash("sha256").update(fingerprintString).digest("hex").substring(0, 16)
  }

  // Anti-cheat check function
  async function checkAntiCheat(fingerprint, domain) {
    const now = new Date()
    const domainCooldownTime = new Date(now.getTime() - ANTI_CHEAT_CONFIG.DOMAIN_COOLDOWN_MINUTES * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Check for recent submission for the same domain from same fingerprint
    const recentDomainSubmission = await SurveyVote.findOne({
      fingerprint: fingerprint,
      domain: domain,
      createdAt: { $gte: domainCooldownTime },
    })

    if (recentDomainSubmission) {
      const minutesLeft = Math.ceil(
        (recentDomainSubmission.createdAt.getTime() +
          ANTI_CHEAT_CONFIG.DOMAIN_COOLDOWN_MINUTES * 60 * 1000 -
          now.getTime()) /
          (60 * 1000),
      )
      return {
        allowed: false,
        reason: "DOMAIN_COOLDOWN",
        message: `Please wait ${minutesLeft} minutes before rating this website again`,
        minutesLeft,
      }
    }

    // Check daily votes for this specific domain
    const dailyDomainVotes = await SurveyVote.countDocuments({
      fingerprint: fingerprint,
      domain: domain,
      createdAt: { $gte: oneDayAgo },
    })

    if (dailyDomainVotes >= ANTI_CHEAT_CONFIG.MAX_DAILY_VOTES_PER_DOMAIN) {
      return {
        allowed: false,
        reason: "DOMAIN_DAILY_LIMIT",
        message: `You have reached the daily voting limit for this website (${ANTI_CHEAT_CONFIG.MAX_DAILY_VOTES_PER_DOMAIN} votes per day)`,
        dailyDomainCount: dailyDomainVotes,
      }
    }

    // Check total daily votes across all domains
    const totalDailyVotes = await SurveyVote.countDocuments({
      fingerprint: fingerprint,
      createdAt: { $gte: oneDayAgo },
    })

    if (totalDailyVotes >= ANTI_CHEAT_CONFIG.MAX_TOTAL_DAILY_VOTES) {
      return {
        allowed: false,
        reason: "TOTAL_DAILY_LIMIT",
        message: `You have reached the daily voting limit across all websites (${ANTI_CHEAT_CONFIG.MAX_TOTAL_DAILY_VOTES} votes per day)`,
        totalDailyCount: totalDailyVotes,
      }
    }

    // Check for suspicious activity
    if (totalDailyVotes >= ANTI_CHEAT_CONFIG.SUSPICIOUS_DAILY_THRESHOLD) {
      console.warn(`Suspicious activity detected: Fingerprint ${fingerprint} has ${totalDailyVotes} votes today`)
      return {
        allowed: false,
        reason: "SUSPICIOUS",
        message: "Unusual voting pattern detected. Please try again later or contact support.",
        totalDailyCount: totalDailyVotes,
      }
    }

    return {
      allowed: true,
      dailyDomainCount: dailyDomainVotes,
      totalDailyCount: totalDailyVotes,
    }
  }

  // POST endpoint to receive survey votes from embedded script
  // Mounted at /survey, so this becomes POST /survey
  router.post("/", async (req, res) => {
    try {
      const { domain, responses, timestamp } = req.body

      // Create browser fingerprint
      const fingerprint = createFingerprint(req)

      // Anti-cheat check
      const antiCheatResult = await checkAntiCheat(fingerprint, domain)
      if (!antiCheatResult.allowed) {
        console.log(
          `Anti-cheat blocked submission: ${antiCheatResult.reason} - Fingerprint: ${fingerprint}, Domain: ${domain}`,
        )
        return res.status(429).json({
          error: antiCheatResult.message,
          reason: antiCheatResult.reason,
          retryAfter: antiCheatResult.minutesLeft || null,
        })
      }

      // Validate required fields
      if (!domain || !responses) {
        return res.status(400).json({
          error: "Domain and responses are required",
        })
      }

      // Validate responses structure
      if (!responses.usability || !responses.design || !responses.search) {
        return res.status(400).json({
          error: "All three responses (usability, design, search) are required",
        })
      }

      // Validate rating values (1-5)
      const ratings = [responses.usability, responses.design, responses.search]
      for (const rating of ratings) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({
            error: "All ratings must be integers between 1 and 5",
          })
        }
      }

      // Get client info for analytics (but don't use for rate limiting)
      const ipAddress =
        req.ip ||
        req.connection.remoteAddress ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers["x-real-ip"] ||
        "unknown"
      const userAgent = req.headers["user-agent"]

      // Create new survey vote
      const surveyVote = new SurveyVote({
        domain,
        responses: {
          usability: responses.usability,
          design: responses.design,
          search: responses.search,
        },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        fingerprint, // Store fingerprint instead of relying on IP
        ipAddress, // Keep IP for analytics but don't use for rate limiting
        userAgent,
      })

      await surveyVote.save()

      // Log successful submission for monitoring
      console.log(
        `Survey submitted: Domain: ${domain}, Fingerprint: ${fingerprint}, Daily domain votes: ${antiCheatResult.dailyDomainCount + 1}, Total daily: ${antiCheatResult.totalDailyCount + 1}`,
      )

      // Return success response
      res.status(201).json({
        success: true,
        message: "Survey vote recorded successfully",
        id: surveyVote._id,
      })
    } catch (error) {
      console.error("Error saving survey vote:", error)
      res.status(500).json({
        error: "Failed to save survey vote",
      })
    }
  })

  // GET endpoint to retrieve survey statistics
  // Mounted at /survey, so this becomes GET /survey/stats/:domain
  router.get("/stats/:domain", async (req, res) => {
    try {
      const { domain } = req.params
      const { startDate, endDate } = req.query

      // Build query
      const query = { domain }
      if (startDate || endDate) {
        query.createdAt = {}
        if (startDate) query.createdAt.$gte = new Date(startDate)
        if (endDate) query.createdAt.$lte = new Date(endDate)
      }

      // Get all votes for the domain
      const votes = await SurveyVote.find(query)

      if (votes.length === 0) {
        return res.json({
          domain,
          totalVotes: 0,
          uniqueVoters: 0,
          averages: {
            usability: 0,
            design: 0,
            search: 0,
            overall: 0,
          },
        })
      }

      // Calculate unique voters (based on fingerprints)
      const uniqueFingerprints = new Set(votes.map((vote) => vote.fingerprint).filter(Boolean))

      // Calculate averages
      const totals = votes.reduce(
        (acc, vote) => {
          acc.usability += vote.responses.usability
          acc.design += vote.responses.design
          acc.search += vote.responses.search
          return acc
        },
        { usability: 0, design: 0, search: 0 },
      )

      const averages = {
        usability: (totals.usability / votes.length).toFixed(2),
        design: (totals.design / votes.length).toFixed(2),
        search: (totals.search / votes.length).toFixed(2),
        overall: ((totals.usability + totals.design + totals.search) / (votes.length * 3)).toFixed(2),
      }

      res.json({
        domain,
        totalVotes: votes.length,
        uniqueVoters: uniqueFingerprints.size,
        averages,
        dateRange: {
          from: startDate || votes[votes.length - 1]?.createdAt,
          to: endDate || votes[0]?.createdAt,
        },
      })
    } catch (error) {
      console.error("Error fetching survey stats:", error)
      res.status(500).json({
        error: "Failed to fetch survey statistics",
      })
    }
  })

  // PUBLIC API: Get overall ratings (same data as /jadval page)
  // Mounted at /survey, so this becomes GET /survey/ratings
  router.get("/ratings", async (req, res) => {
    try {
      const now = new Date()
      const month = req.query.month ? Number.parseInt(req.query.month) : now.getMonth() + 1
      const year = req.query.year ? Number.parseInt(req.query.year) : now.getFullYear()

      // Get all websites/organizations
      const organizations = await Contestant.find({})

      // Get expert ratings for the specified month and year
      const expertRatings = await WebsiteRating.find({
        month: month,
        year: year,
      }).populate("userId", "nickname firstname lastname")

      // Get automatic ratings (if they exist)
      let autoRatings = []
      try {
        autoRatings = await AutoRating.find({
          month: month,
          year: year,
        })
      } catch (error) {
        console.log("AutoRating model not found, continuing without automatic ratings")
      }

      // Get user ratings (if they exist)
      let userRatings = []
      if (UserRating) {
        try {
          userRatings = await UserRating.find({
            month: month,
            year: year,
          })
        } catch (error) {
          console.log("Error fetching user ratings, continuing without user ratings")
        }
      }

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
        metadata: {
          totalOrganizations: organizations.length,
          expertRatingsCount: expertRatings.length,
          autoRatingsCount: autoRatings.length,
          userRatingsCount: userRatings.length,
          generatedAt: new Date().toISOString(),
        },
      }

      // Process each organization
      for (const org of organizations) {
        // Calculate expert score
        const orgExpertRatings = expertRatings.filter((r) => r.websiteId.toString() === org._id.toString())
        let expertScore = 0
        if (orgExpertRatings.length > 0) {
          // Sum the total scores and divide by 3 (not by the number of raters * 3)
          const totalScore = orgExpertRatings.reduce((sum, rating) => sum + rating.totalScore, 0)
          expertScore = Math.round(totalScore / 3)
        }

        // Calculate auto score
        const orgAutoRating = autoRatings.find(
          (r) => r.organizationId && r.organizationId.toString() === org._id.toString(),
        )
        const autoScore = orgAutoRating ? orgAutoRating.totalScore : 0

        // Calculate user score
        const orgUserRating = userRatings.find(
          (r) => r.organizationId && r.organizationId.toString() === org._id.toString(),
        )
        const userScore = orgUserRating ? orgUserRating.totalScore : 0

        // Calculate total score
        const totalScore = expertScore + autoScore + userScore

        // Calculate previous expert score for trend
        const prevOrgExpertRatings = previousExpertRatings.filter((r) => r.websiteId.toString() === org._id.toString())
        let prevExpertScore = 0
        if (prevOrgExpertRatings.length > 0) {
          // Use the same calculation method for previous scores
          const prevTotalScore = prevOrgExpertRatings.reduce((sum, rating) => sum + rating.totalScore, 0)
          prevExpertScore = Math.round(prevTotalScore / 3)
        }

        // Calculate trend (simple comparison with previous month)
        const trend = expertScore - prevExpertScore

        // Add to results
        results.organizations.push({
          id: org._id,
          name: org.name,
          url: org.url,
          scores: {
            expert: expertScore,
            automatic: autoScore,
            user: userScore,
            total: totalScore,
          },
          trend,
          lastUpdated: org.lastEdited,
        })
      }

      // Sort by total score (descending)
      results.organizations.sort((a, b) => b.scores.total - a.scores.total)

      // Add ranking
      results.organizations.forEach((org, index) => {
        org.rank = index + 1
      })

      res.json(results)
    } catch (error) {
      console.error("Error fetching overall ratings:", error)
      res.status(500).json({
        error: "Failed to fetch overall ratings",
      })
    }
  })

  // PUBLIC API: Get specific organization rating
  // Mounted at /survey, so this becomes GET /survey/ratings/:organizationId
  router.get("/ratings/:organizationId", async (req, res) => {
    try {
      const { organizationId } = req.params
      const now = new Date()
      const month = req.query.month ? Number.parseInt(req.query.month) : now.getMonth() + 1
      const year = req.query.year ? Number.parseInt(req.query.year) : now.getFullYear()

      // Get the organization
      const organization = await Contestant.findById(organizationId)
      if (!organization) {
        return res.status(404).json({
          error: "Organization not found",
        })
      }

      // Get expert ratings
      const expertRatings = await WebsiteRating.find({
        websiteId: organizationId,
        month: month,
        year: year,
      }).populate("userId", "nickname firstname lastname")

      // Calculate expert score
      let expertScore = 0
      if (expertRatings.length > 0) {
        const totalScore = expertRatings.reduce((sum, rating) => sum + rating.totalScore, 0)
        expertScore = Math.round(totalScore / 3)
      }

      // Get automatic rating
      let autoScore = 0
      try {
        const autoRating = await AutoRating.findOne({
          organizationId: organizationId,
          month: month,
          year: year,
        })
        autoScore = autoRating ? autoRating.totalScore : 0
      } catch (error) {
        console.log("AutoRating not found")
      }

      // Get user rating
      let userScore = 0
      if (UserRating) {
        try {
          const userRating = await UserRating.findOne({
            organizationId: organizationId,
            month: month,
            year: year,
          })
          userScore = userRating ? userRating.totalScore : 0
        } catch (error) {
          console.log("UserRating not found")
        }
      }

      const totalScore = expertScore + autoScore + userScore

      res.json({
        organization: {
          id: organization._id,
          name: organization.name,
          url: organization.url,
        },
        period: {
          month,
          year,
        },
        scores: {
          expert: expertScore,
          automatic: autoScore,
          user: userScore,
          total: totalScore,
        },
        details: {
          expertRatingsCount: expertRatings.length,
          expertRaters: expertRatings.map((rating) => ({
            name: `${rating.userId.firstname} ${rating.userId.lastname}`,
            score: rating.totalScore,
          })),
        },
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error fetching organization rating:", error)
      res.status(500).json({
        error: "Failed to fetch organization rating",
      })
    }
  })

  return router
}
