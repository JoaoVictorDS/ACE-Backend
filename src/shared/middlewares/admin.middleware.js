const { AuthenticationError, AuthorizationError } = require('../errors')
const ERROR_CATALOG = require('../errors/error-catalog')

function adminMiddleware(req, res, next) {
    const { user } = req

    if (!user) return next(new AuthenticationError(ERROR_CATALOG.AUTHENTICATION.FAILED))

    const isSystemAdmin = user.role === 'ADMIN'

    if (!isSystemAdmin) return next(new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.INSUFFICIENT_PERMISSIONS_FOR_SYSTEM_ADMIN))

    next()
}

module.exports = adminMiddleware