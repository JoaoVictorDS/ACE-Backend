const UserService = require('./user.service')
const { catchAsync } = require('../../shared')

const UserController = {

    create: catchAsync(async (req, res, next) => {
        const data = req.validated.body

        const user = await UserService.create({
            data
        })

        return res.status(201).json(user)
    }),

    list: catchAsync(async (req, res, next) => {
        const users = await UserService.getAll()

        return res.status(200).json(users)
    }),

    showMe: catchAsync(async (req, res, next) => {
        const user = await UserService.getProfile({
            user: req.user
        })

        return res.status(200).json(user)
    }),

    show: catchAsync(async (req, res, next) => {
        const { user_id: userId } = req.validated.params

        const user = await UserService.getUserProfile({
            requesterUser: req.user,
            targetUserId: userId
        })

        return res.status(200).json(user)
    }),

    updateMe: catchAsync(async (req, res, next) => {
        const data = req.validated.body

        const updatedUser = await UserService.update({
            user: req.user,
            data
        })

        return res.status(200).json(updatedUser)
    }),

    update: catchAsync(async (req, res, next) => {
        const { user_id: targetUserId } = req.validated.params
        const data = req.validated.body

        const updatedUser = await UserService.updateUser({
            requesterUser: req.user,
            targetUserId,
            data
        })

        return res.status(200).json(updatedUser)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { user_id: targetUserId } = req.validated.params

        await UserService.delete({
            requesterUser: req.user,
            targetUserId
        })

        return res.status(204).send()
    }),

}

module.exports = UserController