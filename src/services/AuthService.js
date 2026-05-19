const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const AuthService = {

    extractTokenFromHeader(authHeader) {
        if (!authHeader) throw new AppError('Token não fornecido!', 401)

        const parts = authHeader.split(' ')

        if (parts.length !== 2) throw new AppError('Erro no formato do token!', 401)

        const [scheme, token] = parts

        if (!/^Bearer$/i.test(scheme)) throw new AppError('Token malformatado!', 401)

        return token
    },

    async validateToken(token) {
        if (!token) throw new AppError('Token não fornecido!', 401)

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true, name: true, is_active: true }
            })

            if (!user || user.is_active === false) throw new AppError('Acesso negado. Usuário inexistente ou desativado!', 401)

            return user
        } catch (error) {
            const message = error.name === 'TokenExpiredError' ? 'Token expirado!' : 'Token inválido!'
            throw new AppError(message, 401)
        }
    },

    async authenticateUser({ email, password }) {
        const user = await prisma.user.findUnique({
            where: { email }
        })
        if (!user || !user.is_active) throw new AppError('Credenciais inválidas!', 401)

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) throw new AppError('Credenciais inválidas!', 401)

        const secret = process.env.JWT_SECRET
        const refreshSecret = process.env.JWT_REFRESH_SECRET

        if (!secret || !refreshSecret) throw new AppError('Erro interno: Chave de segurança não configurada!', 500)

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

        await prisma.user.update({
            where: { id: user.id },
            data: { refresh_token: refreshToken }
        })

        return {
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }
    },

    async refreshAccessToken(oldRefreshToken) {
        if (!oldRefreshToken) throw new AppError('Refresh Token não fornecido!', 401)

        try {
            const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET)

            const user = await prisma.user.findUnique({
                where: { id: decoded.id }
            })
            if (!user || !user.is_active) throw new AppError('Usuário inválido ou desativado!', 401)

            if (user.refresh_token !== oldRefreshToken) {
                await this.revokeAllSessions(user.id)
                throw new AppError('Sessão inválida. Faça login novamente.', 401)
            }

            const newAccessToken = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            )

            const newRefreshToken = jwt.sign(
                { id: user.id },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            )

            await prisma.user.update({
                where: { id: user.id },
                data: { refresh_token: newRefreshToken }
            })

            return { token: newAccessToken, refreshToken: newRefreshToken }
        } catch (error) {
            throw new AppError('Sessão expirada ou inválida', 401)
        }
    },

    async revokeAllSessions(userId) {
        return await prisma.user.update({
            where: { id: userId },
            data: { refresh_token: null }
        })
    }
}

module.exports = AuthService