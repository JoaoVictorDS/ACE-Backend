const jwt = require('jsonwebtoken')
const prisma = require('../config/prisma')

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido!' })
    }

    const [, token] = authHeader.split(' ')

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true }
        })

        if(!user){
            return res.status(401).json({error: 'Usuário não encontrado ou inativo.'})
        }

        req.userId = user.id
        req.userRole = user.role

        return next()
    } catch (error) {
        console.error('Erro de autenticação: ', error)
        return res.status(401).json({ error: 'Token inválido ou expirado!' })
    }
}

module.exports = authMiddleware