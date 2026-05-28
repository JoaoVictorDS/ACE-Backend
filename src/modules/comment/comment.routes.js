const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const { updateCommentSchema, deleteCommentSchema } = require('./comment.validator')
const CommentController = require('./comment.controller')

router.patch('/:comment_id', authMiddleware, validationMiddleware(updateCommentSchema), CommentController.update)
router.delete('/:comment_id', authMiddleware, validationMiddleware(deleteCommentSchema), CommentController.delete)

module.exports = router