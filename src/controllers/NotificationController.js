const NotificationService = require('../services/NotificationService')
const catchAsync = require('../utils/catchAsync')
const { listNotificationsSchema, markAsReadSchema } = require('../validators/notificationValidator')

const NotificationController = {

    list: catchAsync(async (req, res, next) => {
        const { limit, page } = listNotificationsSchema.parse(req.query)
        const notifications = await NotificationService.getByUser({
            user: req.user,
            limit,
            page
        })

        return res.status(200).json(notifications)
    }),

    markAsRead: catchAsync(async (req, res, next) => {
        const { notification_id: notificationId } = markAsReadSchema.parse(req.params)

        const updatedNotification = await NotificationService.markAsRead({
            user: req.user,
            notificationId
        })

        return res.status(200).json(updatedNotification)
    })

}

module.exports = NotificationController