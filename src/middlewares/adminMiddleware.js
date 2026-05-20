const AppError = require("../errors/AppError")

function adminMiddleware(req, res, next) {
    const { user } = req

    if (!user) return next(new AppError('Sessão inválida. Por favor, faça login novamente!', 401))

    const isSystemAdmin = user.role === 'ADMIN'

    if (!isSystemAdmin) return next(new AppError('Acesso negado. Apenas administradores podem realizar esta operação!', 403))

    next()
}

module.exports = adminMiddleware