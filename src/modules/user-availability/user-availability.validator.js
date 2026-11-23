
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

const availabilityTime = z.string({
    error: (issue) => issue.input === undefined
        ? 'O horário é obrigatório.'
        : 'O horário deve ser uma string.'
}).regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, { error: 'Horário inválido. Utilize o formato HH:mm.' })

const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number)

    return hours * 60 + minutes
}

const availabilityPeriod = z.object({
    status: availabilityStatus,
    started_time: availabilityTime,
    ended_time: availabilityTime.nullable()
})

const availabilityPeriods = z.array(availabilityPeriod).superRefine((periods, ctx) => {
    periods.forEach((period, index) => {
        const startedTime = toMinutes(period.started_time)
        const endedTime = period.ended_time !== null
            ? toMinutes(period.ended_time)
            : null

        if (period.status === 'END_OF_DAY') {
            if (endedTime === null || endedTime !== startedTime) {
                ctx.addIssue({
                    code: 'custom',
                    path: [index, 'ended_time'],
                    message: 'END_OF_DAY deve possuir início e término no mesmo horário.'
                })
            }
        } else if (endedTime !== null && endedTime < startedTime) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'ended_time'],
                message: 'O término não pode ser anterior ao início.'
            })
        }

        if (endedTime === null && index !== periods.length - 1) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'ended_time'],
                message: 'Um período aberto deve ser o último da sequência.'
            })
        }

        if (index === 0) return

        const previousPeriod = periods[index - 1]
        const previousStartedTime = toMinutes(previousPeriod.started_time)
        const previousEndedTime = previousPeriod.ended_time !== null
            ? toMinutes(previousPeriod.ended_time)
            : null

        if (startedTime < previousStartedTime) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'started_time'],
                message: 'Os períodos devem estar em ordem cronológica.'
            })
        }

        if (previousEndedTime === null) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'started_time'],
                message: 'Não pode existir período após um período aberto.'
            })
        } else if (startedTime < previousEndedTime) {
            ctx.addIssue({
                code: 'custom',
                path: [index, 'started_time'],
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

const updateUserPeriodsSchema = {
    params: z.object({
        user_id
    }),

    body: z.object({
        work_date: workDate,
        periods: availabilityPeriods
    })
}

const upsertNotesSchema = {
    body: z.object({
        notes: availabilityNotes
    })
}

const upsertUserNotesSchema = {
    params: z.object({
        user_id
    }),

    body: z.object({
        work_date: workDate,
        notes: availabilityNotes
    })
}

const getDaySchema = {
    params: z.object({
        user_id
    }),

    query: z.object({
        work_date: workDate
    })
}

const getMonthSchema = {
    params: z.object({
        user_id
    }),

    query: z.object({
        year: z.coerce.number()
            .int()
            .min(1000)
            .max(9999),

        month: z.coerce.number()
            .int()
            .min(1)
            .max(12)
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
    getMonthSchema,
    getAvailabilityHistorySchema
}
