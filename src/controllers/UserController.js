const UserService = require('../services/UserService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { createUserSchema, updateUserSchema } = require('../validators/userValidator')

const UserController = {

    create: catchAsync(async (req, res, next) => {
        const result = createUserSchema.safeParse(req.body)
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { name, email, password, role } = result.data

        const user = await UserService.createUser({
            name,
            email,
            password,
            role
        })

        return res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user
        })

    }),

    list: catchAsync(async (req, res, next) => {
        const users = await UserService.getUsers()
        return res.json(users)
    }),

    update: catchAsync(async (req, res, next) => {
        const result = updateUserSchema.safeParse({
            ...req.body,
            user_id: parseInt(req.params.userId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { user_id, ...rest } = result.data

        const updatedUser = await UserService.updateUser(
            user_id,
            rest,
            req.user.id,
            req.user.role
        )

        return res.json({
            message: 'Perfil atualizado!',
            user: updatedUser
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const targetUserId = parseInt(req.params.userId)
        if (!targetUserId || isNaN(targetUserId)) return next(new AppError('O parâmetro "userId" é obrigatório e deve ser number', 400))

        await UserService.deleteUser(
            targetUserId,
            req.user.id,
            req.user.role
        )
        return res.json({
            message: 'Usuário desativado com sucesso!'
        })
    }),

}

module.exports = UserController