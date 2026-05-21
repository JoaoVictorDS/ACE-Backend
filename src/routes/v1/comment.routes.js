const express = require('express')
const router = express.Router()

const { authMiddleware } = require('../../middlewares')

const { CommentController } = require('../../controllers')

router.patch('/:comment_id', authMiddleware, CommentController.update)
router.delete('/:comment_id', authMiddleware, CommentController.delete)

module.exports = router