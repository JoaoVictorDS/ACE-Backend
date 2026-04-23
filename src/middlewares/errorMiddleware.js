const { ZodError } = require('zod')

const errorMiddleware = (err, req, res, next) => {
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 'validation_error',
            message: err.issues[0].message
        })
    }

    const statusCode = err.statusCode || 500
    const status = err.isOperational ? err.status : 'internal_error'
    const message = err.isOperational ? err.message : 'Ocorreu um erro interno no servidor!'
    const isCritical = statusCode === 500

    if (isCritical) {
        console.error(`❌ [CRITICAL] ${req.method} ${req.path}:`, err)
    } else {
        console.warn(`⚠️ [WARN] ${req.method} ${req.path}: ${err.message}`)
    }

    return res.status(statusCode).json({
        status,
        message
    })
}

module.exports = errorMiddleware