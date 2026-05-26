const UserService = require('./user.service')
const catchAsync = require('../../shared/utils/catchAsync')
const { createUserSchema, updateUserSchema, deleteUserSchema } = require('./user.validator')

const UserController = {

    create: catchAsync(async (req, res, next) => {
        const { ...fields } = createUserSchema.parse(req.body)

        const user = await UserService.create({
            ...fields
        })

        return res.status(201).json(user)
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

        return res.status(200).json(updatedUser)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { user_id: targetUserId } = deleteUserSchema.parse(req.params)

        await UserService.delete({
            requesterUser: req.user,
            targetUserId
        })

        return res.status(204).send()
    }),

}

module.exports = UserController