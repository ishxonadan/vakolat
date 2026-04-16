const mongoose = require("mongoose")
const ratingModel = require("../model/rating.model")
const userRatingModel = require("../model/user-rating.model")
const surveyVoteModel = require("../model/survey-vote.model")
const plausibleCacheModel = require("../model/plausible-cache.model")
const auditLogModel = require("../model/audit-log.model")

function registerModels({ vakolat, yoqlama, nazorat }) {
  const permissionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })

  const permissionGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })

  const staffDepartmentSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  )
  staffDepartmentSchema.index({ name: 1 }, { unique: true })

  const staffPositionSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      isActive: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 1 },
    },
    { timestamps: true },
  )
  staffPositionSchema.index({ name: 1 }, { unique: true })

  const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    position: { type: String },
    level: { type: String, required: true, default: "expert" },
    language: { type: String, required: true, default: "uz" },
    permissionGroup: { type: mongoose.Schema.Types.ObjectId, ref: "PermissionGroup" },
    permissionGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "PermissionGroup" }],
    staffDepartment: { type: mongoose.Schema.Types.ObjectId, ref: "StaffDepartment", default: null },
    staffPosition: { type: mongoose.Schema.Types.ObjectId, ref: "StaffPosition", default: null },
    isActive: { type: Boolean, default: true },
  })

  const contestantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    libraryConfig: {
      locationCode: { type: String },
      locationName: { type: String },
      region: { type: String },
      apiEndpoint: { type: String },
      isActive: { type: Boolean, default: false },
    },
    createdAt: { type: Date, default: Date.now },
    lastEdited: { type: Date, default: Date.now },
  })

  const autoRatingSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Websites", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    metrics: {
      visitCount: { type: Number, default: 0 },
      pageVisits: { type: Number, default: 0 },
      interactiveServiceUsage: { type: Number, default: 0 },
      personalAccountCount: { type: Number, default: 0 },
      electronicResourceCount: { type: Number, default: 0 },
      newsViewCount: { type: Number, default: 0 },
      electronicResourceUsage: { type: Number, default: 0 },
    },
    totalScore: { type: Number, default: 0 },
    source: { type: String, enum: ["manual", "plausible", "comprehensive"], default: "manual" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })

  const documentSchema = new mongoose.Schema(
    {
      uuid: { type: String, required: true, unique: true },
      is_deleted: { type: Number, default: 0 },
      owner_id: { type: Number, required: true },
      type: { type: String, required: true },
      title: { type: String, required: true },
      author: { type: String, required: true },
      code: { type: String, required: true },
      udk_bbk: { type: String },
      place: { type: String },
      collective: { type: String },
      devision: { type: String, default: "" },
      year: { type: String },
      approved_date: { type: Date },
      language: { type: String, default: "uz" },
      additional: { type: String },
      soha_kodi: { type: String },
      ilmiy_rahbar: { type: String },
      annotation: { type: String, default: "" },
      ashyo: { type: String },
      srn: { type: String },
      mtt: { type: String },
      volume: { type: String },
      filename: { type: String },
      size: { type: Number, default: 0 },
      category_id: { type: Number, required: true },
      added_date: { type: Date, default: Date.now },
      modified_date: { type: Date },
      level: { type: String, required: true },
    },
    { timestamps: true },
  )

  const razdelSchema = new mongoose.Schema(
    {
      name: String,
      razdel_id: Number,
    },
    { collection: "razdel" },
  )

  const razdelsSchema = new mongoose.Schema(
    {
      name: String,
      razdel_id: Number,
    },
    { collection: "razdels" },
  )

  const levelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mark: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  })

  const languageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    aliases: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  })

  const fieldSchema = new mongoose.Schema(
    {
      code: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
    { collection: "fields" },
  )

  const libraryUserSchema = new mongoose.Schema(
    {
      passport: { type: String, required: true, unique: true },
      fullname: { type: String, required: true },
      ticketId: { type: String, required: true, unique: true },
      globalTicketNumber: { type: Number, required: true, unique: true },
      ticketHistory: [
        {
          date: { type: Date, required: true },
          dailyOrderNumber: { type: Number, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
  )

  const ticketSchema = new mongoose.Schema(
    {
      ticketId: { type: String, required: true },
      passport: { type: String, required: true },
      fullname: { type: String, required: true },
      date: { type: Date, required: true },
      dailyOrderNumber: { type: Number, required: true },
      globalTicketNumber: { type: Number, required: true },
      isUpdate: { type: Boolean, default: false },
      nameChanged: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
  )

  const paymentAccountSchema = new mongoose.Schema(
    {
      userNo: { type: String, required: true, unique: true, index: true },
      balance: { type: Number, default: 0 },
      status: { type: String, default: "active" },
      meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
  )

  const paymentTransactionSchema = new mongoose.Schema(
    {
      userNo: { type: String, required: true, index: true },
      type: {
        type: String,
        enum: ["top_up", "spend", "adjustment", "migration"],
        required: true,
      },
      amount: { type: Number, required: true, min: 0 },
      direction: { type: String, enum: ["in", "out"], required: true },
      serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentService", default: null },
      serviceName: { type: String, default: "" },
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentDepartment", default: null },
      source: { type: String, enum: ["manual", "migration", "service"], default: "manual" },
      comment: { type: String, default: "" },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true },
  )
  paymentTransactionSchema.index({ userNo: 1, createdAt: -1 })

  const paymentServiceSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      code: { type: String, default: "" },
      price: { type: Number, required: true, min: 0, default: 0 },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  )

  const paymentDepartmentSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      code: { type: String, default: "" },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  )

  const userDepartmentSchema = new mongoose.Schema(
    {
      expertId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentDepartment", required: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  )
  userDepartmentSchema.index({ expertId: 1, departmentId: 1 }, { unique: true })

  const systemSettingsSchema = new mongoose.Schema(
    {
      paymentRequireZalForServiceProvision: { type: Boolean, default: false },
    },
    { timestamps: true },
  )

  const paymentServiceProvisionSchema = new mongoose.Schema(
    {
      userNo: { type: String, required: true, index: true },
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentDepartment", default: null },
      items: [
        {
          serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentService", default: null },
          serviceName: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 },
          unitPrice: { type: Number, required: true, min: 0 },
          totalPrice: { type: Number, required: true, min: 0 },
        },
      ],
      totalAmount: { type: Number, required: true, min: 0 },
      comment: { type: String, default: "" },
      status: { type: String, enum: ["active", "cancelled"], default: "active" },
      providedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      cancelledReason: { type: String, default: "" },
      cancelledAt: { type: Date, default: null },
    },
    { timestamps: true },
  )

  const Documents = yoqlama.model("Document", documentSchema)
  const Categories = yoqlama.model("Razdel", razdelSchema)
  const Razdels = yoqlama.model("Razdels", razdelsSchema)
  const Levels = yoqlama.model("Level", levelSchema)
  const Languages = yoqlama.model("Language", languageSchema)
  const Fields = yoqlama.model("Field", fieldSchema)
  const LibraryUsers = nazorat.model("LibraryUser", libraryUserSchema)
  const Tickets = nazorat.model("Ticket", ticketSchema)
  const PaymentAccount = vakolat.model("PaymentAccount", paymentAccountSchema)
  const PaymentTransaction = vakolat.model("PaymentTransaction", paymentTransactionSchema)
  const PaymentService = vakolat.model("PaymentService", paymentServiceSchema)
  const PaymentDepartment = vakolat.model("PaymentDepartment", paymentDepartmentSchema)
  const UserDepartment = vakolat.model("UserDepartment", userDepartmentSchema)
  const PaymentServiceProvision = vakolat.model("PaymentServiceProvision", paymentServiceProvisionSchema)
  const SystemSettings = vakolat.model("SystemSettings", systemSettingsSchema)

  const Permission = vakolat.model("Permission", permissionSchema)
  const PermissionGroup = vakolat.model("PermissionGroup", permissionGroupSchema)
  const Contestant = vakolat.model("Websites", contestantSchema)
  const StaffDepartment = vakolat.model("StaffDepartment", staffDepartmentSchema)
  const StaffPosition = vakolat.model("StaffPosition", staffPositionSchema)
  const User = vakolat.model("User", userSchema)
  const AuditLog = vakolat.model("AuditLog", auditLogModel.auditLogSchema)
  const RatingAssignment = vakolat.model("RatingAssignment", ratingModel.ratingAssignmentSchema)
  const WebsiteRating = vakolat.model("WebsiteRating", ratingModel.websiteRatingSchema)
  const AutoRating = vakolat.model("AutoRating", autoRatingSchema)
  const UserRating = vakolat.model("UserRating", userRatingModel.userRatingSchema)
  const SurveyVote = vakolat.model("SurveyVote", surveyVoteModel.surveyVoteSchema)
  const PlausibleCache = vakolat.model("PlausibleCache", plausibleCacheModel.plausibleCacheSchema)

  return {
    Documents,
    Categories,
    Razdels,
    Levels,
    Languages,
    Fields,
    LibraryUsers,
    Tickets,
    PaymentAccount,
    PaymentTransaction,
    PaymentService,
    PaymentDepartment,
    UserDepartment,
    PaymentServiceProvision,
    SystemSettings,
    Permission,
    PermissionGroup,
    Contestant,
    StaffDepartment,
    StaffPosition,
    User,
    AuditLog,
    RatingAssignment,
    WebsiteRating,
    AutoRating,
    UserRating,
    SurveyVote,
    PlausibleCache,
  }
}

function attachCoreModelsToAppLocals(app, models) {
  app.locals.User = models.User
  app.locals.StaffDepartment = models.StaffDepartment
  app.locals.StaffPosition = models.StaffPosition
  app.locals.Permission = models.Permission
  app.locals.PermissionGroup = models.PermissionGroup
  app.locals.AuditLog = models.AuditLog
  app.locals.PaymentAccount = models.PaymentAccount
  app.locals.PaymentTransaction = models.PaymentTransaction
  app.locals.PaymentService = models.PaymentService
  app.locals.PaymentDepartment = models.PaymentDepartment
  app.locals.UserDepartment = models.UserDepartment
  app.locals.PaymentServiceProvision = models.PaymentServiceProvision
}

module.exports = {
  registerModels,
  attachCoreModelsToAppLocals,
}
