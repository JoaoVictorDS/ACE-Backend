const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { createCommentSchema, listCommentsSchema } = require('./comment.validator')
const CommentController = require('./comment.controller')

router.post('/', authMiddleware, validationMiddleware(createCommentSchema), CommentController.create)
router.get('/', authMiddleware, validationMiddleware(listCommentsSchema), CommentController.list)

module.exports = router