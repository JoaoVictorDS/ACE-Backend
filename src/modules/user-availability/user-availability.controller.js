const { catchAsync } = require('../../shared/utils')
const UserAvailabilityService = require('./user-availability.service')
const LogService = require('../log/log.service')

const UserAvailabilityController = {

    list: catchAsync(async (req, res, next) => {
        const availability = await UserAvailabilityService.get()

        return res.status(200).json(availability)
    }),

    showDay: catchAsync(async (req, res) => {
        const { user_id: userId } = req.validated.params
        const { work_date: workDate } = req.validated.query

        const day = await UserAvailabilityService.getDay({
            userId,
            workDate
        })

        return res.status(200).json(day)
    }),

    showMonth: catchAsync(async (req, res) => {
        const { user_id: userId } = req.validated.params
        const { year, month } = req.validated.query

        const result = await UserAvailabilityService.getMonth({
            userId,
            year,
            month
        })

        return res.status(200).json(result)
    }),

    updateMe: catchAsync(async (req, res, next) => {
        const { status } = req.validated.body

        const result = await UserAvailabilityService.updateStatus({
            user: req.user,
            status
        })

        return res.status(200).json(result)
    }),

    update: catchAsync(async (req, res, next) => {
        const { user_id: targetUserId } = req.validated.params
        const { status } = req.validated.body

        const result = await UserAvailabilityService.updateUserStatus({
            actor: req.user,
            targetUserId,
            status
        })

        return res.status(200).json(result)
    }),

    updatePeriods: catchAsync(async (req, res) => {
        const { user_id: targetUserId } = req.validated.params
        const { work_date: workDate, periods } = req.validated.body

        const updatedDay = await UserAvailabilityService.updateUserPeriods({
            actor: req.user,
            targetUserId,
            workDate,
            periods
        })

        return res.status(200).json(updatedDay)
    }),

    upsert: catchAsync(async (req, res) => {
        const { user_id: targetUserId } = req.validated.params
        const { work_date: workDate, notes } = req.validated.body

        const updatedDay = await UserAvailabilityService.upsertUserNotes({
            actor: req.user,
            targetUserId,
            workDate,
            notes
        })

        return res.status(200).json(updatedDay)
    }),

    upsertMe: catchAsync(async (req, res, next) => {
        const { notes } = req.validated.body

        const updatedDay = await UserAvailabilityService.upsertNotes({
            user: req.user,
            notes
        })

        return res.status(200).json(updatedDay)
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { limit, page } = req.validated.query

        const logs = await LogService.getAvailabilityHistory({
            limit,
            page
        })

        return res.status(200).json(logs)
    }),

}

module.exports = UserAvailabilityController