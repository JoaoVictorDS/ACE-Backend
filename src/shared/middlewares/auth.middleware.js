const AuthService = require('../../modules/auth/auth.service')

async function authMiddleware(req, res, next) {
    try {
        const token = AuthService.extractTokenFromHeader(req.headers.authorization)
        const user = await AuthService.validateToken(token)

        req.user = user

        next()
    } catch (error) {
        return next(error)
    }
}

module.exports = authMiddleware