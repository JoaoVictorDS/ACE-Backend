const ValidationError = require('../errors/ValidationError')

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

            if (schemas.body) {
                try {
                    req.body = schemas.body.parse(req.body)
                } catch (error) {
                    errors.body = error.issues[0]?.message || 'Erro ao validar body'
                }
            }

            if (schemas.query) {
                try {
                    req.query = schemas.query.parse(req.query)
                } catch (error) {
                    errors.query = error.issues[0]?.message || 'Erro ao validar query'
                }
            }

            if (schemas.params) {
                try {
                    req.params = schemas.params.parse(req.params)
                } catch (error) {
                    errors.params = error.issues[0]?.message || 'Erro ao validar params'
                }
            }

            if (schemas.cookies) {
                try {
                    req.cookies = schemas.cookies.parse(req.cookies)
                } catch (error) {
                    errors.cookies = error.issues[0]?.message || 'Erro ao validar cookies'
                }
            }

            if (Object.keys(errors).length > 0) {
                throw new ValidationError(
                    'Erro na validação dos dados',
                    errors
                )
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}

module.exports = validationMiddleware