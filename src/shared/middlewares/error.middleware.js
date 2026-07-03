const { logger } = require('../../config')
const { ZodError } = require('zod')
const { AppError } = require('../../shared/errors')
const { HTTP_STATUS } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

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
            message: issue.message || ERROR_CATALOG.VALIDATION.INVALID.message,
            statusCode: HTTP_STATUS.BAD_REQUEST,
            ...(process.env.NODE_ENV === 'development' && {
                details: err.issues,
            }),
        })
    }

    if (err instanceof AppError) {
        const isCritical = err.statusCode >= 500

        if (isCritical) {
            logger.error({
                method: req.method,
                path: req.path,
                statusCode: err.statusCode,
                error: err.toLog?.() ?? err.message,
            }, 'AppError crítico')
        } else {
            logger.warn({
                method: req.method,
                path: req.path,
                statusCode: err.statusCode,
                message: err.message,
            }, 'AppError operacional')
        }

        return res.status(err.statusCode).json(err.toJSON())
    }

    const isCritical = true
    logger.error({
        method: req.method,
        path: req.path,
        statusCode: err.statusCode || 500,
        error: err.message,
        stack: err.stack,
    }, 'Erro inesperado')

    const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    const response = {
        status: 'internal_error',
        code: 'INTERNAL_ERROR',
        message:
            process.env.NODE_ENV === 'production'
                ? ERROR_CATALOG.INTERNAL.SERVER_ERROR.message
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