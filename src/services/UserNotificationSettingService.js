const { UserNotificationSettingRepository } = require('../repositories')
const NotFoundError = require('../errors/NotFoundError')
const AuthorizationError = require('../errors/AuthorizationError')

/**
 * Serviço de Configuração de Notificações
 * Lógica de negócio para gerenciar preferências de notificações do usuário
 * NÃO acessa Prisma direto - usa UserNotificationSettingRepository
 */
const UserNotificationSettingService = {
    repository: new UserNotificationSettingRepository(),

    /**
     * Busca configurações de notificação do usuário
     * @param {number} userId - ID do usuário
     * @param {object} user - Usuário autenticado
     * @returns {Promise<array>} Array de configurações
     */
    async getByUser(userId, user) {
        if (userId !== user.id) {
            throw new AuthorizationError('Você pode apenas visualizar suas próprias configurações!')
        }

        return await this.repository.findByUser(userId)
    },

    /**
     * Busca configuração específica de notificação
     * @param {number} userId - ID do usuário
     * @param {string} actionType - Tipo de ação
     * @param {number} boardId - ID do board (opcional)
     * @param {object} user - Usuário autenticado
     * @returns {Promise<object>} Configuração ou null
     */
    async getBySetting(userId, actionType, boardId = null, user) {
        if (userId !== user.id) {
            throw new AuthorizationError('Você pode apenas visualizar suas próprias configurações!')
        }

        return await this.repository.findByUserActionAndBoard(userId, actionType, boardId)
    },

    /**
     * Cria uma configuração de notificação
     * @param {object} data - { userId, actionType, boardId, enabled }
     * @param {object} user - Usuário autenticado
     * @returns {Promise<object>} Configuração criada
     */
    async create(data, user) {
        if (data.user_id !== user.id) {
            throw new AuthorizationError('Você não pode criar configurações para outro usuário!')
        }

        return await this.repository.create(data)
    },

    /**
     * Atualiza uma configuração de notificação
     * @param {number} settingId - ID da configuração
     * @param {object} data - Dados para atualizar
     * @param {object} user - Usuário autenticado
     * @returns {Promise<object>} Configuração atualizada
     */
    async update(settingId, data, user) {
        const setting = await this.repository.findById(settingId)

        if (!setting) {
            throw new NotFoundError('Configuração de notificação')
        }

        if (setting.user_id !== user.id) {
            throw new AuthorizationError('Você não pode editar configurações de outro usuário!')
        }

        return await this.repository.update(settingId, data)
    },

    /**
     * Deleta uma configuração de notificação
     * @param {number} settingId - ID da configuração
     * @param {object} user - Usuário autenticado
     * @returns {Promise<object>} Configuração deletada
     */
    async delete(settingId, user) {
        const setting = await this.repository.findById(settingId)

        if (!setting) {
            throw new NotFoundError('Configuração de notificação')
        }

        if (setting.user_id !== user.id) {
            throw new AuthorizationError('Você não pode deletar configurações de outro usuário!')
        }

        return await this.repository.delete(settingId)
    },

    /**
     * Ativa todas as notificações globais do usuário
     * @param {number} userId - ID do usuário
     * @param {object} user - Usuário autenticado
     * @returns {Promise<array>} Configurações atualizadas
     */
    async enableAll(userId, user) {
        if (userId !== user.id) {
            throw new AuthorizationError('Você pode apenas gerenciar suas próprias notificações!')
        }

        return await this.repository.enableAllForUser(userId)
    },

    /**
     * Desativa todas as notificações globais do usuário
     * @param {number} userId - ID do usuário
     * @param {object} user - Usuário autenticado
     * @returns {Promise<array>} Configurações atualizadas
     */
    async disableAll(userId, user) {
        if (userId !== user.id) {
            throw new AuthorizationError('Você pode apenas gerenciar suas próprias notificações!')
        }

        return await this.repository.disableAllForUser(userId)
    },

    /**
     * Ativa notificações para um board específico
     * @param {number} userId - ID do usuário
     * @param {number} boardId - ID do board
     * @param {object} user - Usuário autenticado
     * @returns {Promise<array>} Configurações atualizadas
     */
    async enableBoardNotifications(userId, boardId, user) {
        if (userId !== user.id) {
            throw new AuthorizationError('Você pode apenas gerenciar suas próprias notificações!')
        }

        return await this.repository.enableBoardNotifications(userId, boardId)
    },

    /**
     * Desativa notificações para um board específico
     * @param {number} userId - ID do usuário
     * @param {number} boardId - ID do board
     * @param {object} user - Usuário autenticado
     * @returns {Promise<array>} Configurações atualizadas
     */
    async disableBoardNotifications(userId, boardId, user) {
        if (userId !== user.id) {
            throw new AuthorizationError('Você pode apenas gerenciar suas próprias notificações!')
        }

        return await this.repository.disableBoardNotifications(userId, boardId)
    },
}

module.exports = UserNotificationSettingService
