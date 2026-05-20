const BaseRepository = require('./BaseRepository')

/**
 * Repositório de User
 * Gerencia todas as operações de banco de dados relacionadas a usuários
 * Estende BaseRepository para herdar métodos comuns
 */
class UserRepository extends BaseRepository {
    /**
     * Construtor
     * Define o model como 'user' para usar nas queries
     */
    constructor() {
        super('user')
    }

    /**
     * Busca usuário por email
     * @param {string} email - Email do usuário
     * @param {object} options - Opções (select, include)
     * @returns {Promise<object>} Usuário ou null
     */
    async findByEmail(email, options = {}) {
        return await this.findOne(
            { email: email.toLowerCase() },
            options
        )
    }

    /**
     * Busca usuário por email com todos os dados
     * @param {string} email - Email do usuário
     * @returns {Promise<object>} Usuário com password_hash ou null
     */
    async findByEmailWithPassword(email) {
        return await this.findOne(
            { email: email.toLowerCase() },
            {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    password_hash: true,
                    is_active: true,
                    role: true,
                    refresh_token: true,
                },
            }
        )
    }

    /**
     * Busca usuário por ID para autenticação
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Usuário ou null
     */
    async findByIdForAuth(userId) {
        return await this.findById(userId, {
            select: {
                id: true,
                role: true,
                name: true,
                is_active: true,
            },
        })
    }

    /**
     * Busca usuário por ID para perfil
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Usuário ou null
     */
    async findByIdForProfile(userId) {
        return await this.findById(userId, {
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                is_active: true,
                created_at: true,
            },
        })
    }

    /**
     * Atualiza refresh token do usuário
     * @param {number} userId - ID do usuário
     * @param {string} refreshToken - Novo refresh token
     * @returns {Promise<object>} Usuário atualizado
     */
    async updateRefreshToken(userId, refreshToken) {
        return await this.update(userId, {
            refresh_token: refreshToken,
        })
    }

    /**
     * Busca refresh token do usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Usuário com refresh_token ou null
     */
    async findRefreshToken(userId) {
        return await this.findById(userId, {
            select: {
                id: true,
                refresh_token: true,
                is_active: true,
            },
        })
    }

    /**
     * Revoga todas as sessões do usuário (limpa refresh token)
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Usuário atualizado
     */
    async revokeAllSessions(userId) {
        return await this.update(userId, {
            refresh_token: null,
        })
    }

    /**
     * Busca usuários ativos
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de usuários ativos
     */
    async findActive(limit = 10) {
        return await this.findMany(
            { is_active: true },
            {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
                take: limit,
            }
        )
    }

    /**
     * Desativa um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Usuário atualizado
     */
    async deactivate(userId) {
        return await this.update(userId, {
            is_active: false,
            refresh_token: null,
        })
    }
}

module.exports = UserRepository