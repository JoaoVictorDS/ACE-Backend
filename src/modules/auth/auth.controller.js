const AuthService = require('./auth.service')
const catchAsync = require('../../shared/utils/catchAsync')
const COOKIE_OPTIONS = require('./auth.constants')


const AuthController = {

    login: catchAsync(async (req, res) => {
        const { email, password } = req.validated.body
        const { token, refreshToken, user } = await AuthService.authenticateUser({ email, password })

        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
        return res.json({ token, user })
    }),

    refresh: catchAsync(async (req, res) => {
        const { refreshToken: oldRefreshToken } = req.validated.cookies
        const { token, refreshToken: newRefreshToken } = await AuthService.refreshAccessToken(oldRefreshToken)

        res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS)
        return res.json({ token })
    }),

    logout: catchAsync(async (req, res) => {
        await AuthService.revokeAllSessions(req.user.id)

        res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 })
        return res.json({ message: 'Logout realizado com sucesso!' })
    })
}

module.exports = AuthController