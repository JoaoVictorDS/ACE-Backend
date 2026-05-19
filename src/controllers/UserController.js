const UserService = require('../services/UserService')
const catchAsync = require('../utils/catchAsync')
const { createUserSchema, updateUserSchema, deleteUserSchema } = require('../validators/userValidator')

const UserController = {

    create: catchAsync(async (req, res, next) => {
        const { ...fields } = createUserSchema.parse(req.body)

        const user = await UserService.create({
            ...fields
        })

        return res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const users = await UserService.getAll()

        return res.status(200).json(users)
    }),

    update: catchAsync(async (req, res, next) => {
        const { user_id: targetUserId, ...otherFields } = updateUserSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedUser = await UserService.update({
            requesterUser: req.user,
            targetUserId,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Usuário atualizado com sucesso!',
            updatedUser
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { user_id: targetUserId } = deleteUserSchema.parse(req.params)

        await UserService.delete({
            requesterUser: req.user,
            targetUserId
        })

        return res.status(200).json({
            message: 'Usuário desativado com sucesso!'
        })
    }),

}

module.exports = UserController