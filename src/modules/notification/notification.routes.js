const express = require('express')
const router = express.Router()

const authMiddleware = require('../../shared/middlewares/auth.middleware')
const validationMiddleware = require('../../shared/middlewares/validation.middleware')
const { listNotificationsSchema, markAsReadSchema } = require('./notification.validator')
const NotificationController = require('./notification.controller')

router.get('/', authMiddleware, validationMiddleware(listNotificationsSchema), NotificationController.list)
router.patch('/:notification_id', authMiddleware, validationMiddleware(markAsReadSchema), NotificationController.markAsRead)

module.exports = router