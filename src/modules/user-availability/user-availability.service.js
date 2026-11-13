const UserAvailabilityRepository = require('./user-availability.repository')
const UserRepository = require('../user/user.repository')
const { EventPublisher } = require('../../shared/events')
const { ENTITY_TYPES } = require('../../shared/constants')
const { ConflictError, NotFoundError } = require('../../shared/errors')
const { TransactionManager } = require('../../shared/database')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const _getCurrentWorkDate = (timestamp = new Date()) => {
    return new Date(Date.UTC(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()))
}

const _formatPeriod = (period) => ({
    id: period.id,
    status: period.status,
    startedAt: period.started_at.toISOString(),
    endedAt: period.ended_at?.toISOString() ?? null
})

const _updateStatus = async ({ actor, targetUser, status }) => {
    const timestamp = new Date()
    const workDate = _getCurrentWorkDate(timestamp)

    const result = await TransactionManager.run(async (tx) => {
        const existingDay = await UserAvailabilityRepository.findDayByUserAndDate(targetUser.id, workDate, tx)
        const day = existingDay || await UserAvailabilityRepository.upsertDay(targetUser.id, workDate, tx)
        const latestPeriod = await UserAvailabilityRepository.findLatestPeriodByDayId(day.id, tx)
        const openPeriod = await UserAvailabilityRepository.findOpenPeriodByDayId(day.id, tx)

        const isResuming = latestPeriod?.status === 'END_OF_DAY'

        if (isResuming && openPeriod) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
        }

        if (!isResuming && openPeriod && latestPeriod?.id !== openPeriod.id) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
        }

        if (!isResuming && !openPeriod && latestPeriod) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
        }

        if (status === 'END_OF_DAY' && !openPeriod) {
            if (isResuming) {
                return {
                    data: {
                        day,
                        previousPeriod: null,
                        period: latestPeriod,
                        changed: false
                    },
                    event: null
                }
            }

            throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_NO_OPEN_PERIOD)
        }

        if (openPeriod?.status === status) {
            return {
                data: {
                    day,
                    previousPeriod: null,
                    period: openPeriod,
                    changed: false
                },
                event: null
            }
        }

        let previousPeriod = isResuming ? latestPeriod : null
        let closedPeriod = null

        if (openPeriod) {
            const closed = await UserAvailabilityRepository.closePeriod(openPeriod.id, timestamp, tx)

            if (closed.count !== 1) {
                throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
            }

            closedPeriod = {
                ...openPeriod,
                ended_at: timestamp
            }

            previousPeriod = closedPeriod
        }

        const period = await UserAvailabilityRepository.createPeriod(day.id, status, timestamp, status === 'END_OF_DAY' ? timestamp : null, tx)

        return {
            data: {
                day,
                previousPeriod,
                period,
                changed: true,
                resumed: isResuming
            },
            event: {
                action: existingDay ? 'UPDATE' : 'CREATE',
                changes: {
                    status: {
                        before: latestPeriod?.status ?? null,
                        after: status
                    },
                    periods: {
                        ...(closedPeriod && {
                            closed: {
                                before: _formatPeriod(openPeriod),
                                after: _formatPeriod(closedPeriod)
                            }
                        }),
                        created: _formatPeriod(period)
                    }
                }
            }
        }
    })

    if (result.event) {
        EventPublisher.publish({
            actor: {
                id: actor.id,
                name: actor.name
            },
            entityType: ENTITY_TYPES.USER_AVAILABILITY_DAY,
            entityId: result.data.day.id,
            action: result.event.action,
            resource: {
                availability: {
                    user: {
                        id: targetUser.id,
                        name: targetUser.name
                    },
                    day: {
                        id: result.data.day.id,
                        workDate: result.data.day.work_date.toISOString().slice(0, 10)
                    }
                }
            },
            changes: result.event.changes
        })
    }

    return result.data
}

const _upsertNotes = async ({ actor, targetUser, workDate, notes }) => {
    const normalizedNotes = notes?.trim() || null

    const result = await TransactionManager.run(async (tx) => {
        const existingDay = await UserAvailabilityRepository.findDayByUserAndDate(targetUser.id, workDate, tx)
        const day = existingDay || await UserAvailabilityRepository.upsertDay(targetUser.id, workDate, tx)

        if (existingDay && existingDay.notes === normalizedNotes) {
            return {
                day: existingDay,
                event: null
            }
        }

        const updatedDay = await UserAvailabilityRepository.updateDayNotes(day.id, normalizedNotes, tx)

        return {
            day: updatedDay,
            event: {
                action: existingDay ? 'UPDATE' : 'CREATE',
                changes: {
                    notes: {
                        ...(existingDay && { before: existingDay.notes }),
                        after: normalizedNotes
                    }
                }
            }
        }
    })

    if (result.event) {
        EventPublisher.publish({
            actor: {
                id: actor.id,
                name: actor.name
            },
            entityType: ENTITY_TYPES.USER_AVAILABILITY_DAY,
            entityId: result.day.id,
            action: result.event.action,
            resource: {
                availability: {
                    user: {
                        id: targetUser.id,
                        name: targetUser.name
                    },
                    day: {
                        id: result.day.id,
                        workDate: result.day.work_date.toISOString().slice(0, 10)
                    }
                }
            },
            changes: result.event.changes
        })
    }

    return result.day
}

const _replacePeriods = async ({ actor, targetUser, workDate, periods }) => {
    const date = new Date(`${workDate}T00:00:00.000Z`)

    for (let i = 0; i < periods.length; i++) {
        const period = periods[i]
        const startedAt = new Date(period.started_at)

        if (_getCurrentWorkDate(startedAt).getTime() !== date.getTime()) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
        }

        if (period.ended_at) {
            const endedAt = new Date(period.ended_at)

            if (_getCurrentWorkDate(endedAt).getTime() !== date.getTime()) {
                throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
            }
        }

        if (period.status === 'END_OF_DAY') {
            const previousPeriod = periods[i - 1]

            if (!previousPeriod || previousPeriod.status === 'END_OF_DAY' || !previousPeriod.ended_at || new Date(previousPeriod.ended_at).getTime() !== startedAt.getTime()) {
                throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
            }
        }
    }

    const result = await TransactionManager.run(async (tx) => {
        const day = await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(targetUser.id, date, tx)

        if (!day) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.GENERIC)
        }

        const hasChanged = day.periods.length !== periods.length ||
            day.periods.some((current, index) => {
                const updated = periods[index]

                if (!updated) return true

                const currentStartedAt = current.started_at.getTime()
                const updatedStartedAt = new Date(updated.started_at).getTime()

                const currentEndedAt = current.ended_at?.getTime() ?? null
                const updatedEndedAt = updated.ended_at
                    ? new Date(updated.ended_at).getTime()
                    : null

                return current.status !== updated.status ||
                    currentStartedAt !== updatedStartedAt ||
                    currentEndedAt !== updatedEndedAt
            })

        if (!hasChanged) {
            return {
                day,
                event: null
            }
        }

        const before = day.periods.map(_formatPeriod)

        await UserAvailabilityRepository.deletePeriodsByDayId(day.id, tx)
        await UserAvailabilityRepository.createPeriods(day.id, periods, tx)

        const updatedDay = await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(targetUser.id, date, tx)

        return {
            day: updatedDay,
            event: {
                action: 'UPDATE',
                changes: {
                    periods: {
                        before,
                        after: updatedDay.periods.map(_formatPeriod)
                    }
                }
            }
        }
    })

    if (result.event) {
        EventPublisher.publish({
            actor: {
                id: actor.id,
                name: actor.name
            },
            entityType: ENTITY_TYPES.USER_AVAILABILITY_DAY,
            entityId: result.day.id,
            action: result.event.action,
            resource: {
                availability: {
                    user: {
                        id: targetUser.id,
                        name: targetUser.name
                    },
                    day: {
                        id: result.day.id,
                        workDate: result.day.work_date.toISOString().slice(0, 10)
                    }
                }
            },
            changes: result.event.changes
        })
    }

    return result.day
}

const UserAvailabilityService = {

    async updateStatus({ user, status }) {
        return _updateStatus({
            actor: user,
            targetUser: user,
            status
        })
    },

    async updateUserStatus({ actor, targetUserId, status }) {
        const targetUser = await UserRepository.findByIdPrivate(targetUserId)

        if (!targetUser) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)
        }

        return _updateStatus({
            actor,
            targetUser,
            status
        })
    },

    async updateUserPeriods({ actor, targetUserId, workDate, periods }) {
        const targetUser = await UserRepository.findByIdPrivate(targetUserId)

        if (!targetUser) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)
        }

        return _replacePeriods({
            actor,
            targetUser,
            workDate,
            periods
        })
    },

    async upsertNotes({ user, notes }) {
        return _upsertNotes({
            actor: user,
            targetUser: user,
            workDate: _getCurrentWorkDate(),
            notes
        })
    },

    async upsertUserNotes({ actor, targetUserId, workDate, notes }) {
        const targetUser = await UserRepository.findByIdPrivate(targetUserId)

        if (!targetUser) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)
        }

        const date = new Date(`${workDate}T00:00:00.000Z`)

        return _upsertNotes({
            actor,
            targetUser,
            workDate: date,
            notes
        })
    },

    async get() {
        const workDate = _getCurrentWorkDate()

        const users = await UserRepository.findActiveUsersWithAvailabilityByDate(workDate)

        return users.map((user) => {
            const latestPeriod = user.availability_days[0]?.periods[0] ?? null

            return {
                id: user.id,
                name: user.name,
                status: latestPeriod?.status ?? null,
                changed_at: latestPeriod?.started_at ?? null
            }
        })
    },

    async getDay({ userId, workDate }) {
        const date = new Date(`${workDate}T00:00:00.000Z`)

        const day = await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(userId, date)

        if (!day) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.GENERIC)
        }

        return day
    },

}

module.exports = UserAvailabilityService