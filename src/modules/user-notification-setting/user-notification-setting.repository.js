const { prisma } = require('../../config')

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



    // atualiar

    /**
     * Busca configurações de notificação de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<array>} Array de configurações
     */
    async findByUser(userId) {
        return await this.findMany(
            { user_id: userId },
            {
                orderBy: { action_type: 'asc' },
            }
        )
    },

    /**
     * Busca configuração global de notificação para um usuário
     * @param {number} userId - ID do usuário
     * @param {string} actionType - Tipo de ação
     * @returns {Promise<object>} Configuração global ou null
     */
    async findGlobalSetting(userId, actionType) {
        return await this.findOne({
            user_id: userId,
            action_type: actionType,
            board_id: null,
        })
    },

    /**
     * Busca configuração específica para um board e ação
     * @param {number} userId - ID do usuário
     * @param {number} boardId - ID do board
     * @param {string} actionType - Tipo de ação
     * @returns {Promise<object>} Configuração ou null
     */
    async findBoardSetting(userId, boardId, actionType) {
        return await this.findOne({
            user_id: userId,
            board_id: boardId,
            action_type: actionType,
        })
    },

    /**
     * Busca todas as configurações de um usuário para um board
     * @param {number} userId - ID do usuário
     * @param {number} boardId - ID do board
     * @returns {Promise<array>} Array de configurações
     */
    async findByUserAndBoard(userId, boardId) {
        return await this.findMany(
            { user_id: userId, board_id: boardId },
            {
                orderBy: { action_type: 'asc' },
            }
        )
    },

    /**
     * Cria ou atualiza configuração de notificação
     * @param {number} userId - ID do usuário
     * @param {string} actionType - Tipo de ação
     * @param {boolean} enabled - Se está habilitado
     * @param {number} boardId - ID do board (opcional, null para global)
     * @returns {Promise<object>} Configuração criada/atualizada
     */
    async upsertSetting(userId, actionType, enabled, boardId = null) {
        return await this.prisma.userNotificationSetting.upsert({
            where: {
                user_id_action_type_board_id: {
                    user_id: userId,
                    action_type: actionType,
                    board_id: boardId,
                },
            },
            update: { enabled },
            create: {
                user_id: userId,
                action_type: actionType,
                enabled,
                board_id: boardId,
            },
        })
    },

    /**
     * Ativa notificações para um tipo de ação
     * @param {number} userId - ID do usuário
     * @param {string} actionType - Tipo de ação
     * @param {number} boardId - ID do board (opcional)
     * @returns {Promise<object>} Configuração atualizada
     */
    async enableNotification(userId, actionType, boardId = null) {
        return await this.upsertSetting(userId, actionType, true, boardId)
    },

    /**
     * Desativa notificações para um tipo de ação
     * @param {number} userId - ID do usuário
     * @param {string} actionType - Tipo de ação
     * @param {number} boardId - ID do board (opcional)
     * @returns {Promise<object>} Configuração atualizada
     */
    async disableNotification(userId, actionType, boardId = null) {
        return await this.upsertSetting(userId, actionType, false, boardId)
    },

    /**
     * Ativa todas as notificações de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Resultado da atualização
     */
    async enableAllNotifications(userId) {
        return await this.prisma.userNotificationSetting.updateMany({
            where: { user_id: userId },
            data: { enabled: true },
        })
    },

    /**
     * Desativa todas as notificações de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Resultado da atualização
     */
    async disableAllNotifications(userId) {
        return await this.prisma.userNotificationSetting.updateMany({
            where: { user_id: userId },
            data: { enabled: false },
        })
    },

    /**
     * Deleta configuração de notificação
     * @param {number} userId - ID do usuário
     * @param {string} actionType - Tipo de ação
     * @param {number} boardId - ID do board (opcional)
     * @returns {Promise<object>} Configuração deletada
     */
    async deleteSetting(userId, actionType, boardId = null) {
        return await this.prisma.userNotificationSetting.delete({
            where: {
                user_id_action_type_board_id: {
                    user_id: userId,
                    action_type: actionType,
                    board_id: boardId,
                },
            },
        })
    },

    /**
     * Deleta todas as configurações de um usuário para um board
     * @param {number} userId - ID do usuário
     * @param {number} boardId - ID do board
     * @returns {Promise<object>} Resultado da deleção
     */
    async deleteAllByUserAndBoard(userId, boardId) {
        return await this.prisma.userNotificationSetting.deleteMany({
            where: { user_id: userId, board_id: boardId },
        })
    }
}

module.exports = UserNotificationSettingRepository