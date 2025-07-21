const axios = require("axios")
const cheerio = require("cheerio")

class PlausibleService {
  constructor() {
    this.baseURL = "https://count.natlib.uz/api/v2/query"
    this.token = process.env.PLAUSIBLE_TOKEN || "tq6ILLjzbC4_FRH0oTiveHwcO_HlKXKRSkDsGNj19xM9gwzjyfnxiUX-KFEXzSv4"
    this.useCache = process.env.USE_PLAUSIBLE_CACHE !== "false" // Default to true unless explicitly set to false
    this.cacheHours = 6 // Cache for 6 hours
    this.rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "false" // Allow disabling SSL verification
  }

  // Extract domain from URL for Plausible site_id
  extractSiteId(url) {
    if (!url) return ""

    let domain = url.toLowerCase()
    // Remove protocol
    domain = domain.replace(/^https?:\/\//, "")
    // Remove www
    domain = domain.replace(/^www\./, "")
    // Remove path
    domain = domain.split("/")[0]
    // Remove port
    domain = domain.split(":")[0]

    return domain
  }

  // Get the actual last day of a month (handles 28, 29, 30, 31 days correctly)
  getLastDayOfMonth(month, year) {
    // Create date for the first day of the next month, then subtract 1 day
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const firstDayOfNextMonth = new Date(nextYear, nextMonth - 1, 1)
    const lastDayOfCurrentMonth = new Date(firstDayOfNextMonth.getTime() - 1)
    return lastDayOfCurrentMonth.getDate()
  }

  // Create date range for a specific month (FIXED to cover full month)
  createDateRange(month, year) {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0) // First day of month, start of day
    const lastDay = this.getLastDayOfMonth(month, year)
    const endDate = new Date(year, month - 1, lastDay, 23, 59, 59, 999) // Last day of month, end of day

    console.log(`Date range for ${month}/${year}: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    console.log(`Month has ${lastDay} days`)

    // Format for Plausible API (ISO string)
    return [startDate.toISOString(), endDate.toISOString()]
  }

  // Format date for Uznel (BBS) search (DD.MM.YYYY)
  formatDateForBBS(date) {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Format date for library API (YYYYMMDD) - FIXED to ensure full month coverage
  formatDateForLibraryAPI(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}${month}${day}`
  }

  // Create proper date range for library API calls
  createLibraryDateRange(month, year) {
    const startDate = new Date(year, month - 1, 1) // First day of month
    const lastDay = this.getLastDayOfMonth(month, year)
    const endDate = new Date(year, month - 1, lastDay) // Last day of month

    const dateFrom = this.formatDateForLibraryAPI(startDate)
    const dateTo = this.formatDateForLibraryAPI(endDate)

    console.log(`Library API date range for ${month}/${year}: ${dateFrom} to ${dateTo} (${lastDay} days in month)`)

    return { dateFrom, dateTo, startDate, endDate, daysInMonth: lastDay }
  }

  // Get personal account registrations from library management system (M4)
  async getLibraryPersonalAccounts(libraryConfig, month, year) {
    try {
      console.log(
        `Fetching library personal accounts for ${libraryConfig.locationName} (${libraryConfig.locationCode})`,
      )

      // Create proper date range for the full month
      const { dateFrom, dateTo, daysInMonth } = this.createLibraryDateRange(month, year)

      console.log(`Date range: ${dateFrom} to ${dateTo} (covering all ${daysInMonth} days of the month)`)

      // Create HTTPS agent that ignores SSL certificate errors
      const https = require("https")
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      })

      // Prepare XML request body for user management
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
  <Parameters>
    <Parameter id="_ym_uid">1750761669950629489</Parameter>
    <Parameter id="_ym_d">1750761669</Parameter>
    <Parameter id="_ym_isad">2</Parameter>
    <Parameter id="_ga">GA1.2.1860284375.1750761668</Parameter>
    <Parameter id="_gid">GA1.2.2032696923.1750761669</Parameter>
    <Parameter id="_ga_P192R03FKK">GS2.1.s1750761668$o1$g0$t1750761671$j57$l0$h0</Parameter>
    <Parameter id="_ym_visorc">w</Parameter>
    <Parameter id="USERID">ILHOM</Parameter>
    <Parameter id="className">action.set.user.SetUserListWebSearchQry</Parameter>
    <Parameter id="vLocation">${libraryConfig.locationCode}</Parameter>
    <Parameter id="vLocaLock">Y</Parameter>
    <Parameter id="startPos">1</Parameter>
    <Parameter id="endPos">1000</Parameter>
    <Parameter id="HistAdminIp">195.158.18.173</Parameter>
    <Parameter id="HistDispId">lon.formUserM_WEB</Parameter>
  </Parameters>
  <Dataset id="ds_where">
    <ColumnInfo>
      <Column id="COLUMN" type="STRING" size="100" prop="default" />
      <Column id="TYPE" type="STRING" size="10" prop="default" />
      <Column id="VALUE1" type="STRING" size="1000" prop="default" />
      <Column id="VALUE2" type="STRING" size="1000" prop="default" />
      <Column id="VALUE3" type="STRING" size="1000" prop="default" />
      <Column id="COND" type="STRING" size="10" prop="default" />
      <Column id="SEARCH_TYPE" type="STRING" size="10" prop="default" />
    </ColumnInfo>
    <Rows>
      <Row>
        <Col id="COLUMN">INSERT_DATE</Col>
        <Col id="TYPE">DT</Col>
        <Col id="VALUE1">${dateFrom}</Col>
        <Col id="VALUE2">${dateTo}</Col>
        <Col id="VALUE3"> </Col>
        <Col id="COND">AND</Col>
        <Col id="SEARCH_TYPE"> </Col>
      </Row>
    </Rows>
  </Dataset>
</Root>`

      const options = {
        method: "POST",
        url: libraryConfig.apiEndpoint,
        headers: {
          Accept: "application/xml, text/xml, */*",
          "Accept-Language": "en-US,en;q=0.9,uz-UZ;q=0.8,uz;q=0.7,ru-RU;q=0.6,ru;q=0.5,tg;q=0.4",
          "Cache-Control": "no-cache, no-store",
          Connection: "keep-alive",
          "Content-Type": "text/xml",
          Expires: "-1",
          "If-Modified-Since": "Thu, 01 Jun 1970 00:00:00 GMT",
          Origin: libraryConfig.apiEndpoint.split("/FN/")[0],
          Pragma: "no-cache",
          Referer: libraryConfig.apiEndpoint.split("/FN/")[0] + "/FN/app/index.html",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
        data: xmlData,
        httpsAgent: httpsAgent,
        timeout: 30000,
      }

      const { data } = await axios.request(options)

      // Parse XML response to count user registrations
      const cheerio = require("cheerio")
      const $ = cheerio.load(data, { xmlMode: true })

      let userCount = 0

      // Based on the screenshot, we need to count rows in the dsCount dataset
      // Look for Dataset with id="dsCount" and count its rows
      $('Dataset[id="dsCount"] Rows Row').each((index, element) => {
        userCount++
        console.log(`Found user registration row ${index + 1}`)
      })

      // If dsCount is not found, try alternative dataset names that might contain user data
      if (userCount === 0) {
        // Try ds_list (common alternative)
        $('Dataset[id="ds_list"] Rows Row').each((index, element) => {
          userCount++
          console.log(`Found user registration row ${index + 1} in ds_list`)
        })
      }

      // If still no data, try any dataset with rows
      if (userCount === 0) {
        $("Dataset Rows Row").each((index, element) => {
          userCount++
          console.log(`Found user registration row ${index + 1} in generic dataset`)
        })
      }

      console.log(
        `Found ${userCount} registered users for ${libraryConfig.locationName} in ${month}/${year} (${daysInMonth} days covered)`,
      )

      // Log the raw XML response for debugging (first 500 characters)
      console.log(`Raw XML response preview: ${data.substring(0, 500)}...`)

      return userCount
    } catch (error) {
      console.error(`Error fetching library personal accounts for ${libraryConfig.locationName}:`, error.message)
      throw new Error(`Kutubxona API xatosi (M4): ${error.message}`)
    }
  }

  // Get electronic resources count from library management system (M5)
  async getLibraryElectronicResources(libraryConfig, month, year) {
    try {
      console.log(
        `Fetching library electronic resources for ${libraryConfig.locationName} (${libraryConfig.locationCode})`,
      )

      // Create proper date range for the full month
      const { dateFrom, dateTo, daysInMonth } = this.createLibraryDateRange(month, year)

      console.log(`Date range: ${dateFrom} to ${dateTo} (covering all ${daysInMonth} days of the month)`)

      // Create HTTPS agent that ignores SSL certificate errors
      const https = require("https")
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      })

      // Prepare XML request body for electronic resources (based on the curl command)
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.nexacroplatform.com/platform/dataset">
  <Parameters>
    <Parameter id="_ym_uid">1750761669950629489</Parameter>
    <Parameter id="_ym_d">1750761669</Parameter>
    <Parameter id="_ym_isad">2</Parameter>
    <Parameter id="_ga">GA1.2.1860284375.1750761668</Parameter>
    <Parameter id="_gid">GA1.2.2032696923.1750761669</Parameter>
    <Parameter id="_ga_P192R03FKK">GS2.1.s1750761668$o1$g0$t1750761671$j57$l0$h0</Parameter>
    <Parameter id="_ym_visorc">w</Parameter>
    <Parameter id="USERID">KITOB</Parameter>
    <Parameter id="className">action.cat.bibmngr.CatBibListQrySP2</Parameter>
    <Parameter id="SRCHAREA">ABBR</Parameter>
    <Parameter id="SRCHKIND">0002</Parameter>
    <Parameter id="USEYN">Y</Parameter>
    <Parameter id="LOCATION">${libraryConfig.locationCode}</Parameter>
    <Parameter id="startPos">1</Parameter>
    <Parameter id="endPos">100</Parameter>
    <Parameter id="vSrchType">LIST</Parameter>
  </Parameters>
  <Dataset id="input">
    <ColumnInfo>
      <Column id="COLUMN" type="STRING" size="100" prop="default" />
      <Column id="TYPE" type="STRING" size="10" prop="default" />
      <Column id="VALUE1" type="STRING" size="1000" prop="default" />
      <Column id="VALUE2" type="STRING" size="1000" prop="default" />
      <Column id="VALUE3" type="STRING" size="1000" prop="default" />
      <Column id="COND" type="STRING" size="10" prop="default" />
      <Column id="SEARCH_TYPE" type="STRING" size="10" prop="default" />
    </ColumnInfo>
    <Rows>
      <Row>
        <Col id="COLUMN">UPDATE_DATE</Col>
        <Col id="TYPE">DT</Col>
        <Col id="VALUE1">${dateFrom}</Col>
        <Col id="VALUE2">${dateTo}</Col>
        <Col id="VALUE3"> </Col>
        <Col id="COND">AND</Col>
        <Col id="SEARCH_TYPE"> </Col>
      </Row>
    </Rows>
  </Dataset>
</Root>`

      const options = {
        method: "POST",
        url: libraryConfig.apiEndpoint,
        headers: {
          Accept: "application/xml, text/xml, */*",
          "Accept-Language": "en-US,en;q=0.9,uz-UZ;q=0.8,uz;q=0.7,ru-RU;q=0.6,ru;q=0.5,tg;q=0.4",
          "Cache-Control": "no-cache, no-store",
          Connection: "keep-alive",
          "Content-Type": "text/xml",
          Expires: "-1",
          "If-Modified-Since": "Thu, 01 Jun 1970 00:00:00 GMT",
          Origin: libraryConfig.apiEndpoint.split("/FN/")[0],
          Pragma: "no-cache",
          Referer: libraryConfig.apiEndpoint.split("/FN/")[0] + "/FN/app/index.html",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
        data: xmlData,
        httpsAgent: httpsAgent,
        timeout: 30000,
      }

      const { data } = await axios.request(options)

      // Parse XML response to count electronic resources
      const cheerio = require("cheerio")
      const $ = cheerio.load(data, { xmlMode: true })

      let resourceCount = 0

      // Count rows in various possible dataset names
      // Try dsCount first (most common)
      $('Dataset[id="dsCount"] Rows Row').each((index, element) => {
        resourceCount++
        console.log(`Found electronic resource row ${index + 1}`)
      })

      // If dsCount is not found, try ds_list
      if (resourceCount === 0) {
        $('Dataset[id="ds_list"] Rows Row').each((index, element) => {
          resourceCount++
          console.log(`Found electronic resource row ${index + 1} in ds_list`)
        })
      }

      // If still no data, try output dataset (common for search results)
      if (resourceCount === 0) {
        $('Dataset[id="output"] Rows Row').each((index, element) => {
          resourceCount++
          console.log(`Found electronic resource row ${index + 1} in output`)
        })
      }

      // If still no data, try any dataset with rows
      if (resourceCount === 0) {
        $("Dataset Rows Row").each((index, element) => {
          resourceCount++
          console.log(`Found electronic resource row ${index + 1} in generic dataset`)
        })
      }

      console.log(
        `Found ${resourceCount} electronic resources for ${libraryConfig.locationName} in ${month}/${year} (${daysInMonth} days covered)`,
      )

      // Log the raw XML response for debugging (first 500 characters)
      console.log(`Raw XML response preview: ${data.substring(0, 500)}...`)

      return resourceCount
    } catch (error) {
      console.error(`Error fetching library electronic resources for ${libraryConfig.locationName}:`, error.message)
      throw new Error(`Kutubxona API xatosi (M5): ${error.message}`)
    }
  }

  // Get interactive service usage from Uznel (BBS) system
  async getUznelInteractiveUsage(websiteUrl, month, year) {
    try {
      const domain = this.extractSiteId(websiteUrl)

      // Determine Uznel endpoint based on domain
      let uznelUrl
      if (domain === "natlib.uz" || domain === "www.natlib.uz") {
        uznelUrl = "https://www.natlib.uz/bbs/list/98"
      } else {
        // For other domains, try their own Uznel endpoint
        const protocol = websiteUrl.startsWith("https://") ? "https://" : "http://"
        uznelUrl = `${protocol}${domain}/bbs/list/6`
      }

      // Create proper date range for the full month
      const lastDay = this.getLastDayOfMonth(month, year)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month - 1, lastDay)

      const dateFrom = this.formatDateForBBS(startDate)
      const dateTo = this.formatDateForBBS(endDate)

      console.log(`Fetching Uznel data from ${uznelUrl} for period ${dateFrom} to ${dateTo} (${lastDay} days in month)`)

      // Prepare form data
      const { URLSearchParams } = require("url")
      const encodedParams = new URLSearchParams()
      encodedParams.set("searchKind", "title")
      encodedParams.set("searchKey", "")
      encodedParams.set("dateFrom", dateFrom)
      encodedParams.set("dateTo", dateTo)
      encodedParams.set("oi", "")
      encodedParams.set("os", "asc")
      encodedParams.set("countPerPage", "100") // Increase to get more results

      // Create HTTPS agent that ignores SSL certificate errors
      const https = require("https")
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      })

      const options = {
        method: "POST",
        url: uznelUrl,
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9,uz-UZ;q=0.8,uz;q=0.7,ru-RU;q=0.6,ru;q=0.5,tg;q=0.4",
          "cache-control": "max-age=0",
          connection: "keep-alive",
          "content-type": "application/x-www-form-urlencoded",
          origin: uznelUrl.split("/bbs")[0],
          referer: uznelUrl,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
        },
        data: encodedParams,
        httpsAgent: httpsAgent,
        timeout: 30000,
      }

      const { data } = await axios.request(options)

      // Parse HTML to count entries within the date range
      const $ = cheerio.load(data)

      let entryCount = 0
      const targetMonth = month
      const targetYear = year

      // Find all table rows in the tbody
      $("tbody tr").each((index, element) => {
        const $row = $(element)

        // Get the date cell (4th td - "Yaratilgan sana")
        const dateCell = $row.find("td.reportDate").text().trim()

        if (dateCell) {
          // Parse date in DD.MM.YYYY format
          const dateParts = dateCell.split(".")
          if (dateParts.length === 3) {
            const day = Number.parseInt(dateParts[0])
            const entryMonth = Number.parseInt(dateParts[1])
            const entryYear = Number.parseInt(dateParts[2])

            // Check if entry is within target month and year
            if (entryMonth === targetMonth && entryYear === targetYear) {
              entryCount++
              console.log(`Found Uznel entry: ${dateCell} - Row ${index + 1}`)
            }
          }
        }
      })

      console.log(`Found ${entryCount} Uznel entries for ${domain} in ${month}/${year} (${lastDay} days covered)`)
      return entryCount
    } catch (error) {
      console.error(`Error fetching Uznel data for ${websiteUrl}:`, error.message)
      throw new Error(`Uznel API xatosi (M3): ${error.message}`)
    }
  }

  // Make API call to Plausible
  async queryPlausible(siteId, metrics, dateRange, filters = []) {
    try {
      // Create custom HTTPS agent that ignores SSL certificate errors
      const https = require("https")
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false, // Ignore SSL certificate errors
      })

      const options = {
        method: "POST",
        url: this.baseURL,
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        data: {
          site_id: siteId,
          metrics: metrics,
          date_range: dateRange,
          filters: filters,
        },
        httpsAgent: httpsAgent, // Use custom agent
        timeout: 30000, // 30 second timeout
      }

      console.log(`Querying Plausible for ${siteId}:`, { metrics, dateRange })

      const { data } = await axios.request(options)

      console.log(`Plausible response for ${siteId}:`, data)

      return data
    } catch (error) {
      console.error(`Error querying Plausible for ${siteId}:`, error.response?.data || error.message)
      throw new Error(`Plausible API xatosi: ${error.message}`)
    }
  }

  // Get all metrics for a website for a specific month
  async getWebsiteMetrics(websiteUrl, month, year, PlausibleCache, organizationId = null, Contestant = null) {
    const siteId = this.extractSiteId(websiteUrl)
    const dateRange = this.createDateRange(month, year)
    const daysInMonth = this.getLastDayOfMonth(month, year)

    console.log(`Getting metrics for ${siteId} (${month}/${year}) - ${daysInMonth} days in month`)

    // Check cache first if enabled
    if (this.useCache) {
      const cached = await this.getCachedData(siteId, month, year, PlausibleCache)
      if (cached) {
        console.log(`Using cached data for ${siteId}`)
        return cached.metrics
      }
    }

    // Initialize metrics with default values and error tracking
    const metrics = {
      visitCount: 0,
      pageVisits: 0,
      interactiveServiceUsage: 0,
      personalAccountCount: 0,
      electronicResourceCount: 0,
      newsViewCount: 0,
      electronicResourceUsage: 0,
      lastUpdated: new Date(),
      daysInMonth: daysInMonth, // Track how many days were covered
      errors: [], // Track specific errors for each metric
      sources: {
        plausible: false,
        uznel: false,
        library: false,
      },
    }

    try {
      // M1: Tashrif buyurishlar soni (visitors)
      try {
        const visitorsData = await this.queryPlausible(siteId, ["visitors"], dateRange)
        metrics.visitCount = visitorsData.results[0]?.metrics[0] || 0
        metrics.sources.plausible = true
      } catch (error) {
        console.log(`Failed to get visitors for ${siteId}:`, error.message)
        metrics.errors.push(`M1 (Tashrif): ${error.message}`)
      }

      // M2: Sahifalarga tashriflar soni (pageviews)
      try {
        const pageviewsData = await this.queryPlausible(siteId, ["pageviews"], dateRange)
        metrics.pageVisits = pageviewsData.results[0]?.metrics[0] || 0
        metrics.sources.plausible = true
      } catch (error) {
        console.log(`Failed to get pageviews for ${siteId}:`, error.message)
        metrics.errors.push(`M2 (Sahifalar): ${error.message}`)
      }

      // M3: Interaktiv xizmatlardan foydalanish soni (Uznel entries)
      try {
        metrics.interactiveServiceUsage = await this.getUznelInteractiveUsage(websiteUrl, month, year)
        metrics.sources.uznel = true
      } catch (error) {
        console.log(`Failed to get Uznel data for ${siteId}:`, error.message)
        metrics.errors.push(`M3 (Uznel): ${error.message}`)
        metrics.interactiveServiceUsage = 0
      }

      // M4: Foydalanuvchilarning shaxsiy kabinetlar soni (Library Management System)
      if (Contestant && organizationId) {
        try {
          // Find library configuration for this organization
          const organization = await Contestant.findById(organizationId)

          if (organization && organization.libraryConfig && organization.libraryConfig.isActive) {
            metrics.personalAccountCount = await this.getLibraryPersonalAccounts(
              organization.libraryConfig,
              month,
              year,
            )
            metrics.sources.library = true
            console.log(`Got ${metrics.personalAccountCount} personal accounts from library system for ${siteId}`)
          } else {
            console.log(`No active library configuration for organization ${organizationId}`)
            metrics.errors.push("M4 (Shaxsiy kabinetlar): Kutubxona integratsiyasi sozlanmagan")
          }
        } catch (error) {
          console.log(`Failed to get library personal accounts for ${siteId}:`, error.message)
          metrics.errors.push(`M4 (Shaxsiy kabinetlar): ${error.message}`)
        }
      } else {
        metrics.errors.push("M4 (Shaxsiy kabinetlar): Tashkilot ID yoki Contestant model mavjud emas")
      }

      // M5: Elektron adabiyotlar soni (Electronic resources from library system)
      if (Contestant && organizationId) {
        try {
          // Find library configuration for this organization
          const organization = await Contestant.findById(organizationId)

          if (organization && organization.libraryConfig && organization.libraryConfig.isActive) {
            metrics.electronicResourceCount = await this.getLibraryElectronicResources(
              organization.libraryConfig,
              month,
              year,
            )
            metrics.sources.library = true
            console.log(`Got ${metrics.electronicResourceCount} electronic resources from library system for ${siteId}`)
          } else {
            console.log(`No active library configuration for organization ${organizationId}`)
            // Fall back to Plausible if no library configuration
            try {
              const resourcesData = await this.queryPlausible(siteId, ["events"], dateRange, [
                ["event:name", "is", "resource_access"],
              ])
              metrics.electronicResourceCount = resourcesData.results[0]?.metrics[0] || 0
              metrics.sources.plausible = true
            } catch (error) {
              console.log(`Failed to get resources from Plausible for ${siteId}:`, error.message)
              metrics.errors.push(
                `M5 (Elektron adabiyotlar): Kutubxona integratsiyasi sozlanmagan, Plausible xatosi: ${error.message}`,
              )
            }
          }
        } catch (error) {
          console.log(`Failed to get library electronic resources for ${siteId}:`, error.message)
          metrics.errors.push(`M5 (Elektron adabiyotlar): ${error.message}`)
          // Fall back to Plausible
          try {
            const resourcesData = await this.queryPlausible(siteId, ["events"], dateRange, [
              ["event:name", "is", "resource_access"],
            ])
            metrics.electronicResourceCount = resourcesData.results[0]?.metrics[0] || 0
            metrics.sources.plausible = true
          } catch (fallbackError) {
            console.log(`Failed to get resources from Plausible fallback for ${siteId}:`, fallbackError.message)
            metrics.errors.push(`M5 (Elektron adabiyotlar) fallback: ${fallbackError.message}`)
          }
        }
      } else {
        // No library integration, use Plausible
        try {
          const resourcesData = await this.queryPlausible(siteId, ["events"], dateRange, [
            ["event:name", "is", "resource_access"],
          ])
          metrics.electronicResourceCount = resourcesData.results[0]?.metrics[0] || 0
          metrics.sources.plausible = true
        } catch (error) {
          console.log(`Failed to get resources from Plausible for ${siteId}:`, error.message)
          metrics.errors.push(`M5 (Elektron adabiyotlar): ${error.message}`)
        }
      }

      // M6: Yangiklarni ko'rishlar soni
      try {
        const newsData = await this.queryPlausible(siteId, ["pageviews"], dateRange, [
          ["event:page", "contains", "/bbs/content/1_"],
        ])
        metrics.newsViewCount = newsData.results[0]?.metrics[0] || 0
        metrics.sources.plausible = true
        console.log(`Found ${metrics.newsViewCount} BBS content views for ${siteId} (URLs containing /bbs/content/1_)`)
      } catch (error) {
        console.log(`Failed to get BBS content views for ${siteId}:`, error.message)
        metrics.errors.push(`M6 (Yangiliklar): ${error.message}`)
      }

      // M7: Elektron adabiyotlardan foydalanishlar soni
      try {
        const resourceUsageData = await this.queryPlausible(siteId, ["events"], dateRange, [
          ["event:name", "is", "resource_download"],
          ["event:name", "is", "resource_view"],
        ])
        metrics.electronicResourceUsage = resourceUsageData.results[0]?.metrics[0] || 0
        metrics.sources.plausible = true
      } catch (error) {
        console.log(`Failed to get resource usage for ${siteId}:`, error.message)
        metrics.errors.push(`M7 (Elektron foydalanish): ${error.message}`)
      }

      console.log(`Successfully collected metrics for ${siteId} (${daysInMonth} days covered):`, metrics)

      // Cache the results if caching is enabled
      if (this.useCache) {
        await this.cacheData(siteId, month, year, metrics, PlausibleCache)
      }

      return metrics
    } catch (error) {
      console.error(`Error getting metrics for ${siteId}:`, error)

      // Return zero metrics if everything fails
      return {
        visitCount: 0,
        pageVisits: 0,
        interactiveServiceUsage: 0,
        personalAccountCount: 0,
        electronicResourceCount: 0,
        newsViewCount: 0,
        electronicResourceUsage: 0,
        lastUpdated: new Date(),
        daysInMonth: daysInMonth,
        errors: [`Umumiy xato: ${error.message}`],
        sources: {
          plausible: false,
          uznel: false,
          library: false,
        },
      }
    }
  }

  // Check if cached data exists and is still valid
  async getCachedData(siteId, month, year, PlausibleCache) {
    try {
      const cached = await PlausibleCache.findOne({
        siteId,
        month,
        year,
      })

      if (!cached) {
        return null
      }

      // Check if cache is still valid (within cache hours)
      const now = new Date()
      const cacheAge = (now - cached.lastUpdated) / (1000 * 60 * 60) // hours

      if (cacheAge > this.cacheHours) {
        console.log(`Cache expired for ${siteId} (${cacheAge.toFixed(1)} hours old)`)
        return null
      }

      return cached
    } catch (error) {
      console.error("Error checking cache:", error)
      return null
    }
  }

  // Cache data in database
  async cacheData(siteId, month, year, metrics, PlausibleCache) {
    try {
      await PlausibleCache.findOneAndUpdate(
        { siteId, month, year },
        {
          siteId,
          month,
          year,
          metrics,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true },
      )

      console.log(`Cached data for ${siteId} (${month}/${year})`)
    } catch (error) {
      console.error("Error caching data:", error)
    }
  }

  // Calculate points based on criteria (UPDATED M6 scoring)
  calculatePoints(metrics) {
    let totalScore = 0

    // M1: Tashrif buyurishlar soni (Visit count)
    if (metrics.visitCount === 0) totalScore += 0
    else if (metrics.visitCount <= 90) totalScore += 1
    else if (metrics.visitCount <= 210) totalScore += 2
    else if (metrics.visitCount <= 300) totalScore += 3
    else if (metrics.visitCount <= 390) totalScore += 4
    else totalScore += 5

    // M2: Sahifalarga tashriflar soni (Page visits)
    if (metrics.pageVisits === 0) totalScore += 0
    else if (metrics.pageVisits <= 290) totalScore += 1
    else if (metrics.pageVisits <= 410) totalScore += 2
    else if (metrics.pageVisits <= 500) totalScore += 3
    else totalScore += 4

    // M3: Interaktiv xizmatlardan foydalanish soni (Uznel entries) - UPDATED SCORING
    if (metrics.interactiveServiceUsage === 0) totalScore += 0
    else if (metrics.interactiveServiceUsage <= 15) totalScore += 1
    else if (metrics.interactiveServiceUsage <= 30) totalScore += 2
    else if (metrics.interactiveServiceUsage <= 45) totalScore += 3
    else if (metrics.interactiveServiceUsage <= 60) totalScore += 4
    else totalScore += 5

    // M4: Foydalanuvchilarning shaxsiy kabinetlar soni (Personal account count) - UPDATED SCORING
    if (metrics.personalAccountCount === 0) totalScore += 0
    else if (metrics.personalAccountCount <= 20) totalScore += 1
    else if (metrics.personalAccountCount <= 40) totalScore += 2
    else if (metrics.personalAccountCount <= 60) totalScore += 3
    else totalScore += 4

    // M5: Elektron adabiyotlar soni (Electronic resource count) - UPDATED SCORING
    if (metrics.electronicResourceCount === 0) totalScore += 0
    else if (metrics.electronicResourceCount <= 2) totalScore += 1
    else if (metrics.electronicResourceCount <= 5) totalScore += 2
    else if (metrics.electronicResourceCount <= 8) totalScore += 3
    else if (metrics.electronicResourceCount <= 11) totalScore += 4
    else totalScore += 5

    // M6: Yangiklarni ko'rishlar soni (News view count) - UPDATED SCORING
    if (metrics.newsViewCount === 0) totalScore += 0
    else if (metrics.newsViewCount <= 3) totalScore += 1
    else if (metrics.newsViewCount <= 6) totalScore += 2
    else if (metrics.newsViewCount <= 9) totalScore += 3
    else if (metrics.newsViewCount <= 12) totalScore += 4
    else totalScore += 5

    // M7: Elektron adabiyotlardan foydalanishlar soni (Electronic resource usage)
    if (metrics.electronicResourceUsage === 0) totalScore += 0
    else if (metrics.electronicResourceUsage <= 4) totalScore += 1
    else if (metrics.electronicResourceUsage <= 7) totalScore += 2
    else if (metrics.electronicResourceUsage <= 10) totalScore += 3
    else if (metrics.electronicResourceUsage <= 13) totalScore += 4
    else totalScore += 5

    return totalScore
  }
}

module.exports = PlausibleService
