const NotificationService = require('./notification.service')
const catchAsync = require('../../shared/utils/catchAsync')

const NotificationController = {

    list: catchAsync(async (req, res, next) => {
        const { limit, page } = req.query

        const notifications = await NotificationService.getByUser({
            user: req.user,
            limit,
            page
        })

        return res.status(200).json(notifications)
    }),

    markAsRead: catchAsync(async (req, res, next) => {
        const { notification_id: notificationId } = req.params

        const updatedNotification = await NotificationService.markAsRead({
            user: req.user,
            notificationId
        })

        return res.status(200).json(updatedNotification)
    })

}

module.exports = NotificationController