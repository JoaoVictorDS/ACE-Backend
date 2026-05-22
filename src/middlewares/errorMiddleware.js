const { ZodError } = require('zod')
const AppError = require('../errors/AppError')
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants')

/**
 * @param {Error} err - Erro capturado
 * @param {Object} req - Objeto request
 * @param {Object} res - Objeto response
 * @param {Function} next - Próximo middleware
 */
const errorMiddleware = (err, req, res, next) => {
    if (err instanceof ZodError) {
        const issue = err.issues[0]
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: 'validation_error',
            code: 'VALIDATION_ERROR',
            message: issue.message || ERROR_MESSAGES.VALIDATION_ERROR,
            statusCode: HTTP_STATUS.BAD_REQUEST,
            ...(process.env.NODE_ENV === 'development' && {
                details: err.issues,
            }),
        })
    }

    if (err instanceof AppError) {
        const isCritical = err.statusCode >= 500

        if (isCritical) {
            console.error(
                `❌ [ERROR] ${req.method} ${req.path}:`,
                err.toLog()
            )
        } else {
            console.warn(
                `⚠️  [WARN] ${req.method} ${req.path}: ${err.message}`
            )
        }

        return res.status(err.statusCode).json(err.toJSON())
    }

    const isCritical = true
    console.error(
        `❌ [CRITICAL] ${req.method} ${req.path}:`,
        {
            name: err.name,
            message: err.message,
            statusCode: err.statusCode || 500,
            stack: err.stack,
            timestamp: new Date().toISOString(),
        }
    )

    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    const response = {
        status: 'internal_error',
        code: 'INTERNAL_ERROR',
        message:
            process.env.NODE_ENV === 'production'
                ? ERROR_MESSAGES.INTERNAL_ERROR
                : err.message,
        statusCode,
    }

    if (process.env.NODE_ENV === 'development') {
        response.details = {
            name: err.name,
            stack: err.stack,
            timestamp: new Date().toISOString(),
        }
    }

    return res.status(statusCode).json(response)
}

module.exports = errorMiddleware