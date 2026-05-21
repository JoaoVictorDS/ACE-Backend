const express = require('express')
const router = express.Router()

const { authMiddleware } = require('../../middlewares')

const { NotificationController } = require('../../controllers')

router.get('/', authMiddleware, NotificationController.list)
router.patch('/:notification_id', authMiddleware, NotificationController.markAsRead)

module.exports = router