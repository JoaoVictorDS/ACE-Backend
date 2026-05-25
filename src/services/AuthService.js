const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { UserRepository } = require('../repositories')
const { AuthenticationError } = require('../errors/AuthenticationError')
const { ERROR_MESSAGES } = require('../constants')

const AuthService = {
    userRepository: new UserRepository(),

    /**
     * Extrai token do header Authorization
     * @param {string} authHeader - Header Authorization (ex: "Bearer token123")
     * @returns {string} Token extraído
     * @throws {AuthenticationError} Se formato inválido
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader) {
            throw new AuthenticationError(ERROR_MESSAGES.TOKEN_NOT_PROVIDED)
        }

        const parts = authHeader.split(' ')

        if (parts.length !== 2) {
            throw new AuthenticationError(ERROR_MESSAGES.TOKEN_INVALID)
        }

        const [scheme, token] = parts

        if (!/^Bearer$/i.test(scheme)) {
            throw new AuthenticationError(ERROR_MESSAGES.TOKEN_INVALID)
        }

        return token
    },

    /**
     * Valida um token JWT
     * @param {string} token - Token a validar
     * @returns {Promise<object>} Usuário decodificado
     * @throws {AuthenticationError} Se token inválido ou expirado
     */
    async validateToken(token) {
        if (!token) {
            throw new AuthenticationError(ERROR_MESSAGES.TOKEN_NOT_PROVIDED)
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await this.userRepository.findByIdForAuth(decoded.id)

            if (!user) {
                throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE)
            }

            return user
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error
            }

            const message =
                error.name === 'TokenExpiredError'
                    ? ERROR_MESSAGES.TOKEN_EXPIRED
                    : ERROR_MESSAGES.TOKEN_INVALID

            throw new AuthenticationError(message)
        }
    },

    /**
     * Autentica usuário com email e senha
     * @param {object} credentials - { email, password }
     * @returns {Promise<object>} { token, refreshToken, user }
     * @throws {AuthenticationError} Se credenciais inválidas
     */
    async authenticateUser({ email, password }) {
        // Busca usuário por email
        const user = await this.userRepository.findByEmailWithPassword(email)

        if (!user || !user.is_active) {
            throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS)
        }

        // Valida senha
        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
            throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS)
        }

        // Valida variáveis de ambiente
        const secret = process.env.JWT_SECRET
        const refreshSecret = process.env.JWT_REFRESH_SECRET

        if (!secret || !refreshSecret) {
            throw new Error('Erro interno: Chave de segurança não configurada!')
        }

        // Gera tokens
        const token = jwt.sign(
            { id: user.id, role: user.role },
            secret,
            { expiresIn: '7d' }
        )

        const refreshToken = jwt.sign(
            { id: user.id },
            refreshSecret,
            { expiresIn: '7d' }
        )

        // Salva refresh token no banco
        await this.userRepository.updateRefreshToken(user.id, refreshToken)

        return {
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        }
    },

    /**
     * Atualiza access token usando refresh token
     * @param {string} oldRefreshToken - Refresh token anterior
     * @returns {Promise<object>} { token, refreshToken }
     * @throws {AuthenticationError} Se refresh token inválido
     */
    async refreshAccessToken(oldRefreshToken) {
        if (!oldRefreshToken) {
            throw new AuthenticationError(
                'Refresh Token não fornecido!'
            )
        }

        try {
            const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET)

            // Busca usuário com refresh token
            const user = await this.userRepository.findRefreshToken(decoded.id)

            if (!user || !user.is_active) {
                throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE)
            }

            // Valida refresh token armazenado
            if (user.refresh_token !== oldRefreshToken) {
                await this.revokeAllSessions(user.id)
                throw new AuthenticationError('Sessão inválida. Faça login novamente.')
            }

            // Gera novo access token
            const newAccessToken = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            )

            // Gera novo refresh token
            const newRefreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            )

            // Atualiza refresh token no banco
            await this.userRepository.updateRefreshToken(user.id, newRefreshToken)

            return {
                token: newAccessToken,
                refreshToken: newRefreshToken,
            }
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error
            }

            throw new AuthenticationError('Sessão expirada ou inválida')
        }
    },

    /**
     * Revoga todas as sessões do usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Usuário atualizado
     */
    async revokeAllSessions(userId) {
        return await this.userRepository.revokeAllSessions(userId)
    },
}

module.exports = AuthService