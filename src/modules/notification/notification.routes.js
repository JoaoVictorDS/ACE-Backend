const express = require('express')
const router = express.Router()

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { listNotificationsSchema, markAsReadSchema } = require('./notification.validator')
const NotificationController = require('./notification.controller')

router.get('/', authMiddleware, validationMiddleware(listNotificationsSchema), NotificationController.list)
router.patch('/:notification_id', authMiddleware, validationMiddleware(markAsReadSchema), NotificationController.markAsRead)

module.exports = router