
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

const _getCurrentWorkTime = (timestamp = new Date()) => {
    const hours = String(timestamp.getHours()).padStart(2, '0')
    const minutes = String(timestamp.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
}

const _normalizeAvailabilityTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number)

    const seconds = 0

    return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds, 0))
}

const _formatAvailabilityTime = (time) => {
    const hours = String(time.getUTCHours()).padStart(2, '0')
    const minutes = String(time.getUTCMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
}

const _getTimeInMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number)

    return hours * 60 + minutes
}

const _formatPeriod = (period) => ({
    id: period.id,
    status: period.status,
    started_time: _formatAvailabilityTime(period.started_time),
    ended_time: period.ended_time
        ? _formatAvailabilityTime(period.ended_time)
        : null
})

const _getPeriodDurationSeconds = ({ period, workDate, currentWorkDate, currentTime }) => {
    const startedTime = _getTimeInMinutes(_formatAvailabilityTime(period.started_time))

    let endedTime

    if (period.ended_time) {
        endedTime = _getTimeInMinutes(_formatAvailabilityTime(period.ended_time))
    } else {
        if (workDate !== currentWorkDate) {
            return null
        }

        endedTime = _getTimeInMinutes(currentTime)
    }

    const durationMinutes = Math.max(0, endedTime - startedTime)

    return durationMinutes * 60
}

const _updateStatus = async ({ actor, targetUser, status }) => {
    const timestamp = new Date()
    const workDate = _getCurrentWorkDate(timestamp)
    const currentTime = _getCurrentWorkTime(timestamp)
    const normalizedTime = _normalizeAvailabilityTime(currentTime)

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

        if (openPeriod && _getTimeInMinutes(currentTime) <= _getTimeInMinutes(_formatAvailabilityTime(openPeriod.started_time))) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
        }

        let previousPeriod = isResuming ? latestPeriod : null
        let closedPeriod = null

        if (openPeriod) {
            const closed = await UserAvailabilityRepository.closePeriod(
                openPeriod.id,
                normalizedTime,
                tx
            )

            if (closed.count !== 1) {
                throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
            }

            closedPeriod = {
                ...openPeriod,
                ended_time: normalizedTime
            }

            previousPeriod = closedPeriod
        }

        const period = await UserAvailabilityRepository.createPeriod(day.id, status, normalizedTime, status === 'END_OF_DAY' ? normalizedTime : null, tx)

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
            actor,
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

    return {
        ...result.data,
        previousPeriod: result.data.previousPeriod
            ? _formatPeriod(result.data.previousPeriod)
            : null,
        period: result.data.period
            ? _formatPeriod(result.data.period)
            : null
    }
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
            actor,
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

    const normalizedPeriods = periods.map((period) => ({
        status: period.status,
        started_time: _normalizeAvailabilityTime(period.started_time),
        ended_time: period.ended_time
            ? _normalizeAvailabilityTime(period.ended_time)
            : null
    }))

    for (let i = 0; i < periods.length; i++) {
        const period = periods[i]

        if (period.status === 'END_OF_DAY') {
            const previousPeriod = periods[i - 1]

            if (!previousPeriod || previousPeriod.status === 'END_OF_DAY' || !previousPeriod.ended_time || previousPeriod.ended_time !== period.started_time) {
                throw new ConflictError(ERROR_CATALOG.CONFLICT.AVAILABILITY_INVALID_STATE)
            }
        }
    }

    const result = await TransactionManager.run(async (tx) => {
        const existingDay = await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(targetUser.id, date, tx)

        if (!existingDay && normalizedPeriods.length === 0) {
            return {
                day: null,
                event: null
            }
        }

        if (!existingDay) {
            await UserAvailabilityRepository.upsertDay(targetUser.id, date, tx)
        }

        const day = existingDay || await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(targetUser.id, date, tx)

        const hasChanged = day.periods.length !== normalizedPeriods.length ||
            day.periods.some((current, index) => {
                const updated = normalizedPeriods[index]

                if (!updated) return true

                const currentStartedTime = _formatAvailabilityTime(current.started_time)
                const updatedStartedTime = _formatAvailabilityTime(updated.started_time)

                const currentEndedTime = current.ended_time
                    ? _formatAvailabilityTime(current.ended_time)
                    : null

                const updatedEndedTime = updated.ended_time
                    ? _formatAvailabilityTime(updated.ended_time)
                    : null

                return current.status !== updated.status ||
                    currentStartedTime !== updatedStartedTime ||
                    currentEndedTime !== updatedEndedTime
            })

        if (!hasChanged) {
            return {
                day,
                event: null
            }
        }

        const before = day.periods.map(_formatPeriod)

        await UserAvailabilityRepository.deletePeriodsByDayId(day.id, tx)
        await UserAvailabilityRepository.createPeriods(day.id, normalizedPeriods, tx)

        const updatedDay = await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(targetUser.id, date, tx)

        return {
            day: updatedDay,
            event: {
                action: existingDay ? 'UPDATE' : 'CREATE',
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
            actor,
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

    if (!result.day) return null

    return {
        ...result.day,
        periods: result.day.periods.map(_formatPeriod)
    }
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
                changed_time: latestPeriod
                    ? _formatAvailabilityTime(latestPeriod.started_time)
                    : null
            }
        })
    },

    async getDay({ userId, workDate }) {
        const date = new Date(`${workDate}T00:00:00.000Z`)

        const day = await UserAvailabilityRepository.findDayWithPeriodsByUserAndDate(userId, date)

        if (!day) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.GENERIC)
        }

        return {
            ...day,
            periods: day.periods.map(_formatPeriod)
        }
    },

    async getMonth({ userId, year, month }) {
        const targetUser = await UserRepository.findByIdPrivate(userId)

        if (!targetUser) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)
        }

        const startDate = new Date(Date.UTC(year, month - 1, 1))
        const endDate = new Date(Date.UTC(year, month, 1))
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

        const currentDate = new Date()
        const currentWorkDate = _getCurrentWorkDate(currentDate)
            .toISOString()
            .slice(0, 10)

        const currentTime = _getCurrentWorkTime(currentDate)

        const existingDays = await UserAvailabilityRepository.findDaysByUserAndDateRange(userId, startDate, endDate)

        const daysByDate = new Map(
            existingDays.map((day) => [
                day.work_date.toISOString().slice(0, 10),
                day
            ])
        )

        const days = Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(Date.UTC(year, month - 1, index + 1))
            const workDate = date.toISOString().slice(0, 10)

            const existingDay = daysByDate.get(workDate)

            const periods = (existingDay?.periods ?? []).map((period) => ({
                ..._formatPeriod(period),
                duration_seconds: _getPeriodDurationSeconds({
                    period,
                    workDate,
                    currentWorkDate,
                    currentTime
                })
            }))

            const availableSeconds = periods
                .filter((period) => period.status === 'AVAILABLE')
                .reduce((total, period) => total + (period.duration_seconds ?? 0), 0)

            const externalActivitySeconds = periods
                .filter((period) => period.status === 'EXTERNAL_ACTIVITY')
                .reduce((total, period) => total + (period.duration_seconds ?? 0), 0)

            const hasOpenPeriod = periods.some((period) => period.ended_time === null)

            return {
                id: existingDay?.id ?? null,
                work_date: workDate,
                notes: existingDay?.notes ?? null,
                periods,
                totals: {
                    available_seconds: availableSeconds,
                    external_activity_seconds: externalActivitySeconds
                },
                has_open_period: hasOpenPeriod,
                requires_review: hasOpenPeriod && workDate < currentWorkDate
            }
        })

        const totals = days.reduce((result, day) => ({
            available_seconds: result.available_seconds + day.totals.available_seconds,
            external_activity_seconds: result.external_activity_seconds + day.totals.external_activity_seconds
        }), {
            available_seconds: 0,
            external_activity_seconds: 0
        })

        const requiresReview = days.some((day) => day.requires_review)

        return {
            user: {
                id: targetUser.id,
                name: targetUser.name
            },
            year,
            month,
            requires_review: requiresReview,
            totals,
            days
        }
    },

}

module.exports = UserAvailabilityService
