const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')

const NotificationController = require('./notification.controller')

router.get('/', authMiddleware, NotificationController.list)
router.patch('/:notification_id', authMiddleware, NotificationController.markAsRead)

module.exports = router