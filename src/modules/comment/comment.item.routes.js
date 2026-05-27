const express = require('express')
const router = express.Router({ mergeParams: true })

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const CommentController = require('./comment.controller')

router.post('/', authMiddleware, CommentController.create)
router.get('/', authMiddleware, CommentController.list)

module.exports = router