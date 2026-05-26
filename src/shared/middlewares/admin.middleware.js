const AuthenticationError = require('../errors/AuthenticationError')
const AuthorizationError = require('../errors/AuthorizationError')

function adminMiddleware(req, res, next) {
    const { user } = req

    if (!user) return next(new AuthenticationError('Sessão inválida. Por favor, faça login novamente.'))

    const isSystemAdmin = user.role === 'ADMIN'

    if (!isSystemAdmin) return next(new AuthorizationError('Acesso negado. Apenas administradores podem realizar esta operação.'))

    next()
}

module.exports = adminMiddleware