const { z } = require('zod')
const { email, password } = require('../../shared/validators/common.fields')

const loginSchema = {
    body: z.object({
        email,

        password
    })
}

const refreshTokenCookieSchema = {
    cookies: z.object({
        refreshToken: z.string({
            error: (issue) => issue.input === undefined && 'Refresh Token não encontrado.'
        }).min(1)
    })
}


module.exports = {
    loginSchema,
    refreshTokenCookieSchema
}