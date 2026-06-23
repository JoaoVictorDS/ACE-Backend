const { TransactionManager, PermissionService, RESOURCE_TYPES, PERMISSION_LEVELS, NotFoundError } = require('../../shared')
const UserNotificationSettingRepository = require('./user-notification-setting.repository')

const UserNotificationSettingService = {

    async update({ user, boardId, settings }) {
        if (boardId) {
            await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
            return this._updateBoardSettings(user, boardId, settings)
        }

        return this._updateGlobalSettings(user, settings)
    },

    async _updateBoardSettings(user, boardId, settings) {
        const userId = user.id
        await TransactionManager.run(async (tx) => {
            for (const setting of settings) {
                await UserNotificationSettingRepository.upsert(userId, boardId, setting, tx)
            }
        })

        return this.getEffectiveSettings({ user, boardId })
    },

    async _updateGlobalSettings(user, settings) {
        const userId = user.id
        return await TransactionManager.run(async (tx) => {
            await Promise.all(
                settings.map(s => UserNotificationSettingRepository.updateSetting(userId, null, s.action_type, s.enabled, tx))
            )

            return UserNotificationSettingRepository.findSettings(userId, null, tx)
        })
    },

    async getEffectiveSettings({ user, boardId }) {
        const userId = user.id
        if (!boardId)
            return UserNotificationSettingRepository.findSettings(userId, null)

        const [boardSettings, globalSettings] = await Promise.all([
            UserNotificationSettingRepository.findSettings(userId, boardId),
            UserNotificationSettingRepository.findSettings(userId, null)
        ])
        const boardMap = new Map(boardSettings.map(s => [s.action_type, s]))

        return globalSettings.map(g => {
            const boardSetting = boardMap.get(g.action_type)
            if (boardSetting) {
                return {
                    ...boardSetting,
                    source: 'board'
                }
            }
            return {
                ...g,
                source: 'global'
            }
        })
    },

    async resetBoardSetting({ user, boardId, actionType }) {
        const userId = user.id
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        const deleted = await UserNotificationSettingRepository.deleteSetting(userId, boardId, actionType)
        if (!deleted) throw new NotFoundError('Configuração não encontrada.')

        return this.getEffectiveSettings({ user, boardId })
    },

    async resetAllBoardSettings({ user, boardId }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)

        await UserNotificationSettingRepository.delete(user.id, boardId)

        return this.getEffectiveSettings({ user, boardId })
    },

}

module.exports = UserNotificationSettingService
