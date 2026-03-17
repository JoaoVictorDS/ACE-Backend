const AppError = require("../utils/AppError")

function adminMiddleware(req, res, next) {

    if (!req.user || req.user.role !== 'ADMIN') {
        return next(new AppError('Acesso negado. Apenas administradores podem realizar esta operação!', 403))
    }

    next()
}

module.exports = adminMiddleware