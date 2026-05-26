const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const CommentController = require('./comment.controller')

router.patch('/:comment_id', authMiddleware, CommentController.update)
router.delete('/:comment_id', authMiddleware, CommentController.delete)

module.exports = router