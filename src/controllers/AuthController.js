const UserService = require('../services/UserService')
const catchAsync = require('../utils/catchAsync')
const { loginSchema } = require('../validators/authValidator')

const AuthController = {

    login: catchAsync(async (req, res, next) => {
        const { email, password } = loginSchema.parse(req.body)

        const auth = await UserService.authenticateUser({
            email,
            password
        })

        return res.status(200).json(auth)
    })

}

module.exports = AuthController