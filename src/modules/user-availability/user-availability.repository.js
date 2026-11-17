
const prisma = require('../../config/prisma')

const UserAvailabilityRepository = {

    async findDayByUserAndDate(userId, workDate, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityDay.findUnique({
            where: {
                user_id_work_date: {
                    user_id: userId,
                    work_date: workDate
                }
            }
        })
    },

    async upsertDay(userId, workDate, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityDay.upsert({
            where: {
                user_id_work_date: {
                    user_id: userId,
                    work_date: workDate
                }
            },
            create: {
                user_id: userId,
                work_date: workDate
            },
            update: {}
        })
    },

    async findDayWithPeriods(dayId, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityDay.findUnique({
            where: { id: dayId },
            include: {
                periods: {
                    orderBy: [
                        { started_time: 'asc' },
                        { id: 'asc' }
                    ]
                }
            }
        })
    },

    async findLatestPeriodByDayId(dayId, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.findFirst({
            where: {
                availability_day_id: dayId
            },
            orderBy: [
                { started_time: 'desc' },
                { id: 'desc' }
            ]
        })
    },

    async findOpenPeriodByDayId(dayId, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.findFirst({
            where: {
                availability_day_id: dayId,
                ended_time: null
            },
            orderBy: [
                { started_time: 'desc' },
                { id: 'desc' }
            ]
        })
    },

    async createPeriod(availabilityDayId, status, startedTime, endedTime = null, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.create({
            data: {
                availability_day_id: availabilityDayId,
                status,
                started_time: startedTime,
                ended_time: endedTime
            }
        })
    },

    async closePeriod(periodId, endedTime, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.updateMany({
            where: {
                id: periodId,
                ended_time: null
            },
            data: {
                ended_time: endedTime
            }
        })
    },

    async updateDayNotes(dayId, notes, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityDay.update({
            where: { id: dayId },
            data: { notes }
        })
    },

    async findDayWithPeriodsByUserAndDate(userId, workDate, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityDay.findUnique({
            where: {
                user_id_work_date: {
                    user_id: userId,
                    work_date: workDate
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                periods: {
                    orderBy: [
                        { started_time: 'asc' },
                        { id: 'asc' }
                    ]
                }
            }
        })
    },

    async deletePeriodsByDayId(dayId, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.deleteMany({
            where: {
                availability_day_id: dayId
            }
        })
    },

    async createPeriods(dayId, periods, tx = null) {
        const client = tx || prisma

        if (periods.length === 0) return { count: 0 }

        return client.userAvailabilityPeriod.createMany({
            data: periods.map((period) => ({
                availability_day_id: dayId,
                status: period.status,
                started_time: period.started_time,
                ended_time: period.ended_time
            }))
        })
    },

    async findDaysByUserAndDateRange(userId, startDate, endDate, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityDay.findMany({
            where: {
                user_id: userId,
                work_date: {
                    gte: startDate,
                    lt: endDate
                }
            },
            include: {
                periods: {
                    orderBy: [
                        { started_time: 'asc' },
                        { id: 'asc' }
                    ]
                }
            },
            orderBy: {
                work_date: 'asc'
            }
        })
    },

}

module.exports = UserAvailabilityRepository
