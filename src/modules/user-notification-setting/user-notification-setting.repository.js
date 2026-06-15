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

    async create(data, tx = null) {
        const client = tx || prisma

        return client.userNotificationSetting.createMany({ data })
    },

}

module.exports = UserNotificationSettingRepository