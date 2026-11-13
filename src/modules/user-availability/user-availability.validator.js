const { z } = require('zod')
const { user_id, page, limit } = require('../../shared/validators/common.fields')

const availabilityStatus = z.enum(['AVAILABLE', 'BREAK', 'EXTERNAL_ACTIVITY', 'END_OF_DAY'], {
    error: (issue) => issue.input === undefined
        ? 'O campo "status" é obrigatório'
        : 'Status de disponibilidade inválido. Use "AVAILABLE", "BREAK", "EXTERNAL_ACTIVITY" ou "END_OF_DAY"'
})

const availabilityNotes = z.string({
    error: (issue) => issue.input === undefined
        ? 'O campo "notes" é obrigatório'
        : 'As observações devem ser string'
}).trim()

const workDate = z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

    const date = new Date(`${value}T00:00:00.000Z`)

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
}, { error: 'Data inválida.' })

const availabilityPeriod = z.object({
    status: availabilityStatus,

    started_at: z.iso.datetime({
        offset: true,
        error: 'Data de início inválida.'
    }),

    ended_at: z.iso.datetime({
        offset: true,
        error: 'Data de término inválida.'
    }).nullable()
})

const availabilityPeriods = z.array(availabilityPeriod).superRefine((periods, ctx) => {
    periods.forEach((period, index) => {
        const startedAt = new Date(period.started_at).getTime()
        const endedAt = period.ended_at
            ? new Date(period.ended_at).getTime()
            : null

        if (period.status === 'END_OF_DAY') {
            if (endedAt === null || endedAt !== startedAt) {
                ctx.addIssue({
                    code: 'custom',
                    path: [index, 'ended_at'],
                    message: 'END_OF_DAY deve possuir início e término no mesmo instante.'
                })
            }
        } else if (endedAt !== null && endedAt <= startedAt) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'ended_at'],
                message: 'O término deve ser posterior ao início.'
            })
        }

        if (endedAt === null && index !== periods.length - 1) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'ended_at'],
                message: 'Um período aberto deve ser o último da sequência.'
            })
        }

        if (index === 0) return

        const previousPeriod = periods[index - 1]
        const previousStartedAt = new Date(previousPeriod.started_at).getTime()
        const previousEndedAt = previousPeriod.ended_at
            ? new Date(previousPeriod.ended_at).getTime()
            : null

        if (startedAt < previousStartedAt) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'started_at'],
                message: 'Os períodos devem estar em ordem cronológica.'
            })
        }

        if (previousEndedAt === null) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'started_at'],
                message: 'Não pode existir período após um período aberto.'
            })
        } else if (startedAt < previousEndedAt) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'started_at'],
                message: 'Os períodos não podem se sobrepor.'
            })
        }
    })
})

const updateStatusSchema = {
    body: z.object({
        status: availabilityStatus
    })
}

const updateUserStatusSchema = {
    params: z.object({
        user_id
    }),

    body: z.object({
        status: availabilityStatus
    })
}

const upsertNotesSchema = {
    body: z.object({
        notes: availabilityNotes
    })
}

const upsertUserNotesSchema = {
    params: z.object({
        user_id,
        work_date: workDate
    }),

    body: z.object({
        notes: availabilityNotes
    })
}

const getDaySchema = {
    params: z.object({
        user_id,
        work_date: workDate
    })
}

const updateUserPeriodsSchema = {
    params: z.object({
        user_id,
        work_date: workDate
    }),

    body: z.object({
        periods: availabilityPeriods
    })
}

const getAvailabilityHistorySchema = {
    query: z.object({
        limit,
        page
    })
}

module.exports = {
    updateStatusSchema,
    updateUserStatusSchema,
    updateUserPeriodsSchema,
    upsertNotesSchema,
    upsertUserNotesSchema,
    getDaySchema,
    getAvailabilityHistorySchema
}