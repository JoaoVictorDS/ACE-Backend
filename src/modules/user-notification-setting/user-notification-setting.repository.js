const prisma = require('../../config/prisma')

const UserNotificationSettingRepository = {

    /**
     * Busca configurações de notificação para usuários
     * @param {number} usersIds - IDs de usuários
     * @param {number} boardId - ID do board
     * @returns {Promise<object>} Configuração global ou null
     */
    async findUserSettings(usersIds, boardId) {
        return prisma.userNotificationSetting.findMany({
            where: {
                user_id: { in: usersIds },
                OR: [
                    { board_id: boardId },
                    { board_id: null }
                ]
            },
        })
    },

    async findSettings(userId, boardId, tx = null) {
        const client = tx || prisma

        return client.userNotificationSetting.findMany({
            where: {
                user_id: userId,
                board_id: boardId
            },
            orderBy: { id: 'asc' }
        })
    },

    async create(data, tx = null) {
        const client = tx || prisma

        return client.userNotificationSetting.createMany({ data })
    },

    async upsert(userId, boardId, data, tx = null) {
        const client = tx || prisma

        return client.userNotificationSetting.upsert({
            where: {
                user_id_board_id_action_type: { action_type: data.action_type, board_id: boardId, user_id: userId }
            },
            create: {
                user_id: userId,
                board_id: boardId,
                action_type: data.action_type,
                enabled: data.enabled
            },
            update: data
        })
    },

    async updateSetting(userId, boardId, actionType, enabled, tx = null) {
        const client = tx || prisma

        return await client.userNotificationSetting.updateMany({
            where: { user_id: userId, board_id: boardId, action_type: actionType },
            data: { enabled }
        })
    },

    async delete(userId, boardId, tx = null) {
        const client = tx || prisma

        return client.userNotificationSetting.deleteMany({
            where: {
                user_id: userId,
                board_id: boardId
            }
        })
    },

    async deleteSetting(userId, boardId, actionType, tx = null) {
        const client = tx || prisma

        return client.userNotificationSetting.deleteMany({
            where: {
                user_id: userId,
                board_id: boardId,
                action_type: actionType
            }
        })
    }

}

module.exports = UserNotificationSettingRepository