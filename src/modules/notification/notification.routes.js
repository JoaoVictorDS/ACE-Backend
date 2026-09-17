const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { listNotificationsSchema, markAsReadSchema, markAsUnreadSchema } = require('./notification.validator')
const NotificationController = require('./notification.controller')

router.get('/', authMiddleware, validationMiddleware(listNotificationsSchema), NotificationController.list)
router.patch('/:notification_id/read', authMiddleware, validationMiddleware(markAsReadSchema), NotificationController.markAsRead)
router.patch('/:notification_id/unread', authMiddleware, validationMiddleware(markAsUnreadSchema), NotificationController.markAsUnread)

module.exports = router