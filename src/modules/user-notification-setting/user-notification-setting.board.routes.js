const express = require('express')
const router = express.Router({ mergeParams: true })

const { authMiddleware, validationMiddleware } = require('../../shared/middlewares')
const { listUserNotificationSettingSchema, updateUserNotificationSettingSchema, deleteUserNotificationSettingSchema, resetUserNotificationSettingSchema } = require('./user-notification-setting.validator')
const UserNotificationSettingController = require('./user-notification-setting.controller')

router.patch('/', authMiddleware, validationMiddleware(updateUserNotificationSettingSchema), UserNotificationSettingController.update)
router.get('/', authMiddleware, validationMiddleware(listUserNotificationSettingSchema), UserNotificationSettingController.list)
router.delete('/:action_type', authMiddleware, validationMiddleware(deleteUserNotificationSettingSchema), UserNotificationSettingController.delete)
router.delete('/', authMiddleware, validationMiddleware(resetUserNotificationSettingSchema), UserNotificationSettingController.reset)

module.exports = router