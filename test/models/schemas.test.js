const { expect } = require('chai')
const mongoose = require('mongoose')

describe('Mongoose Schemas', () => {
  describe('User Rating Schema', () => {
    const { userRatingSchema } = require('../../src/model/user-rating.model')
    let UserRating

    before(() => {
      if (mongoose.models.UserRating) {
        delete mongoose.models.UserRating
      }
      UserRating = mongoose.model('UserRating', userRatingSchema)
    })

    it('should create a valid user rating', () => {
      const rating = new UserRating({
        organizationId: new mongoose.Types.ObjectId(),
        month: 1,
        year: 2024,
        metrics: {
          websiteUsability: 5,
          websiteDesign: 4,
          searchUsability: 3,
        },
        totalScore: 12,
      })

      const error = rating.validateSync()
      expect(error).to.be.undefined
    })

    it('should require organizationId', () => {
      const rating = new UserRating({
        month: 1,
        year: 2024,
      })

      const error = rating.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('organizationId')
    })

    it('should require month', () => {
      const rating = new UserRating({
        organizationId: new mongoose.Types.ObjectId(),
        year: 2024,
      })

      const error = rating.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('month')
    })

    it('should require year', () => {
      const rating = new UserRating({
        organizationId: new mongoose.Types.ObjectId(),
        month: 1,
      })

      const error = rating.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('year')
    })

    it('should set default values for metrics', () => {
      const rating = new UserRating({
        organizationId: new mongoose.Types.ObjectId(),
        month: 1,
        year: 2024,
      })

      expect(rating.metrics.websiteUsability).to.equal(0)
      expect(rating.metrics.websiteDesign).to.equal(0)
      expect(rating.metrics.searchUsability).to.equal(0)
      expect(rating.totalScore).to.equal(0)
    })

    it('should set default createdAt and updatedAt', () => {
      const rating = new UserRating({
        organizationId: new mongoose.Types.ObjectId(),
        month: 1,
        year: 2024,
      })

      expect(rating.createdAt).to.be.instanceOf(Date)
      expect(rating.updatedAt).to.be.instanceOf(Date)
    })
  })

  describe('Survey Vote Schema', () => {
    const { surveyVoteSchema } = require('../../src/model/survey-vote.model')
    let SurveyVote

    before(() => {
      if (mongoose.models.SurveyVote) {
        delete mongoose.models.SurveyVote
      }
      SurveyVote = mongoose.model('SurveyVote', surveyVoteSchema)
    })

    it('should create a valid survey vote', () => {
      const vote = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 5,
          design: 4,
          search: 3,
        },
        fingerprint: 'test-fingerprint-123',
      })

      const error = vote.validateSync()
      expect(error).to.be.undefined
    })

    it('should require domain', () => {
      const vote = new SurveyVote({
        responses: {
          usability: 5,
          design: 4,
          search: 3,
        },
        fingerprint: 'test-fingerprint-123',
      })

      const error = vote.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('domain')
    })

    it('should require fingerprint', () => {
      const vote = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 5,
          design: 4,
          search: 3,
        },
      })

      const error = vote.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('fingerprint')
    })

    it('should require all response fields', () => {
      const vote = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 5,
          design: 4,
          // missing search
        },
        fingerprint: 'test-fingerprint-123',
      })

      const error = vote.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('responses.search')
    })

    it('should validate response values are between 1 and 5', () => {
      const voteMin = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 0, // Too low
          design: 3,
          search: 3,
        },
        fingerprint: 'test-fingerprint-123',
      })

      let error = voteMin.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('responses.usability')

      const voteMax = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 3,
          design: 6, // Too high
          search: 3,
        },
        fingerprint: 'test-fingerprint-123',
      })

      error = voteMax.validateSync()
      expect(error).to.exist
      expect(error.errors).to.have.property('responses.design')
    })

    it('should set default timestamp and createdAt', () => {
      const vote = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 5,
          design: 4,
          search: 3,
        },
        fingerprint: 'test-fingerprint-123',
      })

      expect(vote.timestamp).to.be.instanceOf(Date)
      expect(vote.createdAt).to.be.instanceOf(Date)
    })

    it('should accept optional ipAddress and userAgent', () => {
      const vote = new SurveyVote({
        domain: 'natlib.uz',
        responses: {
          usability: 5,
          design: 4,
          search: 3,
        },
        fingerprint: 'test-fingerprint-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      const error = vote.validateSync()
      expect(error).to.be.undefined
      expect(vote.ipAddress).to.equal('192.168.1.1')
      expect(vote.userAgent).to.equal('Mozilla/5.0')
    })
  })

  describe('Rating Model Schemas', () => {
    const { ratingAssignmentSchema, websiteRatingSchema } = require('../../src/model/rating.model')
    let RatingAssignment, WebsiteRating

    before(() => {
      if (mongoose.models.RatingAssignment) {
        delete mongoose.models.RatingAssignment
      }
      if (mongoose.models.WebsiteRating) {
        delete mongoose.models.WebsiteRating
      }
      RatingAssignment = mongoose.model('RatingAssignment', ratingAssignmentSchema)
      WebsiteRating = mongoose.model('WebsiteRating', websiteRatingSchema)
    })

    describe('Rating Assignment Schema', () => {
      it('should create a valid rating assignment', () => {
        const assignment = new RatingAssignment({
          userId: new mongoose.Types.ObjectId(),
          websiteIds: [new mongoose.Types.ObjectId()],
          month: 1,
          year: 2024,
        })

        const error = assignment.validateSync()
        expect(error).to.be.undefined
      })

      it('should require userId, month, and year', () => {
        const assignment = new RatingAssignment({
          websiteIds: [new mongoose.Types.ObjectId()],
        })

        const error = assignment.validateSync()
        expect(error).to.exist
        expect(error.errors).to.have.property('userId')
        expect(error.errors).to.have.property('month')
        expect(error.errors).to.have.property('year')
      })

      it('should default completed to false', () => {
        const assignment = new RatingAssignment({
          userId: new mongoose.Types.ObjectId(),
          websiteIds: [new mongoose.Types.ObjectId()],
          month: 1,
          year: 2024,
        })

        expect(assignment.completed).to.be.false
      })

      it('should set assignedAt date', () => {
        const assignment = new RatingAssignment({
          userId: new mongoose.Types.ObjectId(),
          websiteIds: [new mongoose.Types.ObjectId()],
          month: 1,
          year: 2024,
        })

        expect(assignment.assignedAt).to.be.instanceOf(Date)
      })
    })

    describe('Website Rating Schema', () => {
      it('should create a valid website rating', () => {
        const rating = new WebsiteRating({
          userId: new mongoose.Types.ObjectId(),
          websiteId: new mongoose.Types.ObjectId(),
          month: 1,
          year: 2024,
          ratings: {
            content: [true, false, true],
            reliability: [true, true],
            usability: [true],
          },
        })

        const error = rating.validateSync()
        expect(error).to.be.undefined
      })

      it('should require userId, websiteId, month, and year', () => {
        const rating = new WebsiteRating({
          ratings: {},
        })

        const error = rating.validateSync()
        expect(error).to.exist
        expect(error.errors).to.have.property('userId')
        expect(error.errors).to.have.property('websiteId')
        expect(error.errors).to.have.property('month')
        expect(error.errors).to.have.property('year')
      })

      it('should default totalScore to 0', () => {
        const rating = new WebsiteRating({
          userId: new mongoose.Types.ObjectId(),
          websiteId: new mongoose.Types.ObjectId(),
          month: 1,
          year: 2024,
        })

        expect(rating.totalScore).to.equal(0)
      })

      it('should accept comments', () => {
        const rating = new WebsiteRating({
          userId: new mongoose.Types.ObjectId(),
          websiteId: new mongoose.Types.ObjectId(),
          month: 1,
          year: 2024,
          comments: 'Good website with excellent content',
        })

        const error = rating.validateSync()
        expect(error).to.be.undefined
        expect(rating.comments).to.equal('Good website with excellent content')
      })

      it('should set ratedAt date', () => {
        const rating = new WebsiteRating({
          userId: new mongoose.Types.ObjectId(),
          websiteId: new mongoose.Types.ObjectId(),
          month: 1,
          year: 2024,
        })

        expect(rating.ratedAt).to.be.instanceOf(Date)
      })
    })
  })
})
