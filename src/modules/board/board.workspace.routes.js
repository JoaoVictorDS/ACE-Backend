const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createBoardSchema, listBoardSchema } = require('./board.validator')
const BoardController = require('./board.controller')

router.get('/', authMiddleware, validationMiddleware(listBoardSchema), BoardController.list)
router.post('/', authMiddleware, validationMiddleware(createBoardSchema), BoardController.create)

module.exports = router