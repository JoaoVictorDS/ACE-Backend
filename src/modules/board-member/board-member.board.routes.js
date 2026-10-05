const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { updatePreferencesSchema } = require('./board-member.validator')
const BoardMemberController = require('../board-member/board-member.controller')

router.patch('/', authMiddleware, validationMiddleware(updatePreferencesSchema), BoardMemberController.updatePreferences)

module.exports = router