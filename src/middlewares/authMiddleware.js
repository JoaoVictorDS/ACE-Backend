const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

async function authMiddleware(req, res, next) {

    const authHeader = req.headers.authorization
    if (!authHeader) {
        return next(new AppError('Token não fornecido!', 401))
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2) {
        return next(new AppError('Erro no formato do token!', 401))
    }

    const [scheme, token] = parts
    if (!/^Bearer$/i.test(scheme)) {
        return next(new AppError('Token malformatado!', 401))
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true, is_active: true }
        })

        if (!user || user.is_active === false) {
            return next(new AppError('Acesso negado. Usuário inexistente ou desativado!', 401))
        }

        req.user = {
            id: user.id,
            role: user.role
        }

        return next()
    } catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Token expirado!' : 'Token inválido!'
        return next(new AppError(message, 401))
    }

}

module.exports = authMiddleware