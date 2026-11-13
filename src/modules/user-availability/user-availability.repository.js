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
                        { started_at: 'asc' },
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
                { started_at: 'desc' },
                { id: 'desc' }
            ]
        })
    },

    async findOpenPeriodByDayId(dayId, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.findFirst({
            where: {
                availability_day_id: dayId,
                ended_at: null
            },
            orderBy: [
                { started_at: 'desc' },
                { id: 'desc' }
            ]
        })
    },

    async createPeriod(availabilityDayId, status, startedAt, endedAt = null, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.create({
            data: {
                availability_day_id: availabilityDayId,
                status,
                started_at: startedAt,
                ended_at: endedAt
            }
        })
    },

    async closePeriod(periodId, endedAt, tx = null) {
        const client = tx || prisma

        return client.userAvailabilityPeriod.updateMany({
            where: {
                id: periodId,
                ended_at: null
            },
            data: {
                ended_at: endedAt
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
                        { started_at: 'asc' },
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
            data: periods.map(period => ({
                availability_day_id: dayId,
                status: period.status,
                started_at: new Date(period.started_at),
                ended_at: period.ended_at
                    ? new Date(period.ended_at)
                    : null
            }))
        })
    },

}

module.exports = UserAvailabilityRepository