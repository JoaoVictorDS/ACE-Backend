const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const UserRepository = require('../user/user.repository')
const { AuthenticationError } = require('../../shared/errors')
const { ERROR_MESSAGES } = require('../../shared/constants')

const AuthService = {

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

    async validateToken(token) {
        if (!token) {
            throw new AuthenticationError(ERROR_MESSAGES.TOKEN_NOT_PROVIDED)
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await UserRepository.findByIdForAuth(decoded.id)

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
        const user = await UserRepository.findByEmailWithPassword(email)

        if (!user || !user.is_active) {
            throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS)
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
            throw new AuthenticationError(ERROR_MESSAGES.INVALID_CREDENTIALS)
        }

        const secret = process.env.JWT_SECRET
        const refreshSecret = process.env.JWT_REFRESH_SECRET

        if (!secret || !refreshSecret) {
            throw new Error('Erro interno: Chave de segurança não configurada!')
        }

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

        await UserRepository.updateRefreshToken(user.id, refreshToken)

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

            const user = await UserRepository.findRefreshToken(decoded.id)

            if (!user || !user.is_active) {
                throw new AuthenticationError(ERROR_MESSAGES.USER_INACTIVE)
            }

            if (user.refresh_token !== oldRefreshToken) {
                await this.revokeAllSessions(user.id)
                throw new AuthenticationError('Sessão inválida. Faça login novamente.')
            }

            const newAccessToken = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            )

            const newRefreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            )

            await UserRepository.updateRefreshToken(user.id, newRefreshToken)

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
        return await UserRepository.revokeAllSessions(userId)
    },
}

module.exports = AuthService