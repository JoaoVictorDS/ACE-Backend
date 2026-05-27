const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')

const BoardController = require('./board.controller')

router.post('/', authMiddleware, BoardController.create)

module.exports = router