const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500

    if (err.statusCode === 500) console.error('❌ Erro Interno: ', err)

    return res.status(err.statusCode).json({
        status: 'error',
        message: err.message || 'Erro interno do servidor'
    })
}

module.exports = errorMiddleware