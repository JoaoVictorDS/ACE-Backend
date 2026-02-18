const UserService = require('../services/UserService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { loginSchema } = require('../validators/authValidator')

const AuthController = {

    login: catchAsync(async (req, res, next) => {
        const result = loginSchema.safeParse(req.body)
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { email, password } = result.data

        const authData = await UserService.authenticateUser({
            email,
            password
        })

        return res.status(200).json(authData)

    })

}

module.exports = AuthController