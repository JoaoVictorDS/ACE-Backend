const { ValidationError } = require('../errors')

/**
 * @param {Object} schemas - Schemas Zod a validar
 * @param {ZodSchema} schemas.body - Schema para req.body
 * @param {ZodSchema} schemas.query - Schema para req.query
 * @param {ZodSchema} schemas.params - Schema para req.params
 * @param {ZodSchema} schemas.cookies - Schema para req.cookies
 * @returns {Function} Middleware Express
 */
const validationMiddleware = (schemas = {}) => {
    return (req, res, next) => {
        try {
            const errors = {}
            const sources = {
                body: req.body,
                query: req.query,
                params: req.params,
                cookies: req.cookies
            }

            req.validated = {}

            for (const [key, schema] of Object.entries(schemas)) {
                if (!schema) continue
                const result = schema.safeParse(sources[key])

                if (!result.success) {
                    errors[key] = result.error.issues.map(i => i.message)
                } else {
                    req.validated[key] = result.data
                }
            }

            if (Object.keys(errors).length > 0) {
                return next(new ValidationError('Erro na validação dos dados', errors))
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}

module.exports = validationMiddleware