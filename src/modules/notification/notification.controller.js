const NotificationService = require('./notification.service')
const { catchAsync } = require('../../shared')

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
    })

}

module.exports = NotificationController