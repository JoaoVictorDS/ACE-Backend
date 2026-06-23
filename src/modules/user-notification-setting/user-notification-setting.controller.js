const { catchAsync } = require('../../shared')
const UserNotificationSettingService = require('./user-notification-setting.service')

const UserNotificationSettingController = {

    update: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { settings } = req.validated.body

        const userNotificationSettings = await UserNotificationSettingService.update({
            user: req.user,
            boardId,
            settings
        })

        return res.status(200).json(userNotificationSettings)
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params

        const userNotificationSettings = await UserNotificationSettingService.getEffectiveSettings({
            user: req.user,
            boardId
        })

        return res.status(200).json(userNotificationSettings)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { board_id: boardId, action_type: actionType } = req.validated.params

        const userNotificationSettings = await UserNotificationSettingService.resetBoardSetting({
            user: req.user,
            actionType,
            boardId
        })

        return res.status(200).json(userNotificationSettings)
    }),

    reset: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params

        const userNotificationSettings = await UserNotificationSettingService.resetAllBoardSettings({
            user: req.user,
            boardId
        })

        return res.status(200).json(userNotificationSettings)
    }),

}

module.exports = UserNotificationSettingController