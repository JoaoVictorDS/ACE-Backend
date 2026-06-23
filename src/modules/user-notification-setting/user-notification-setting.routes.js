const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { listUserNotificationSettingSchema, updateUserNotificationSettingSchema } = require('./user-notification-setting.validator')
const UserNotificationSettingController = require('./user-notification-setting.controller')

router.patch('/', authMiddleware, validationMiddleware(updateUserNotificationSettingSchema), UserNotificationSettingController.update)
router.get('/', authMiddleware, validationMiddleware(listUserNotificationSettingSchema), UserNotificationSettingController.list)

module.exports = router