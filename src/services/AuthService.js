const jwt = require('jsonwebtoken')
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
    }
}

module.exports = AuthService