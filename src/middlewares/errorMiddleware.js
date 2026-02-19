const { ZodError } = require('zod')

const errorMiddleware = (err, req, res, next) => {
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: 'validation_error',
            message: err.issues[0].message
        })
    }

    err.statusCode = err.statusCode || 500

    if (err.statusCode === 500) {
        console.error(`❌ Erro Crítico [${req.method}] ${req.path}:`, err)
    } else {
        console.warn(`⚠️ Aviso [${req.method}] ${req.path}: ${err.message}`)
    }

    return res.status(err.statusCode).json({
        status: 'error',
        message: err.message || 'Erro interno do servidor'
    })
}

module.exports = errorMiddleware