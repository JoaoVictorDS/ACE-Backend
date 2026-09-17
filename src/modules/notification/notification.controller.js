const { catchAsync } = require('../../shared/utils')
const NotificationService = require('./notification.service')

const NotificationController = {

    list: catchAsync(async (req, res) => {
        const { page, limit } = req.validated.query

        const notifications = await NotificationService.getByUser({
            user: req.user,
            page,
            limit
        })

        return res.status(200).json(notifications)
    }),

    markAsRead: catchAsync(async (req, res, next) => {
        const { notification_id: notificationId } = req.validated.params

        const updatedNotification = await NotificationService.markAsRead({
            user: req.user,
            notificationId
        })

        return res.status(200).json(updatedNotification)
    }),

    markAsUnread: catchAsync(async (req, res, next) => {
        const { notification_id: notificationId } = req.validated.params

        const updatedNotification = await NotificationService.markAsUnread({
            user: req.user,
            notificationId
        })

        return res.status(200).json(updatedNotification)
    }),

    markAllAsRead: catchAsync(async (req, res, next) => {
        const updatedNotifications = await NotificationService.markAllAsRead({
            user: req.user
        })

        return res.status(200).json(updatedNotifications)
    })

}

module.exports = NotificationController