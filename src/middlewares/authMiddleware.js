const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')

async function authMiddleware(req, res, next) {

    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido!' })
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Erro no formato do token!' })
    }

    const [scheme, token] = parts
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token malformatado!' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true, is_active: true }
        })

        if (!user || user.is_active === false) {
            return res.status(401).json({ error: 'Acesso negado. Usuário inexistente ou desativado!' })
        }

        req.user = {
            id: user.id,
            role: user.role
        }

        return next()
    } catch (error) {
        console.error('Erro de autenticação:', error)
        return res.status(401).json({ error: 'Token inválido ou expirado!' })
    }

}

module.exports = authMiddleware