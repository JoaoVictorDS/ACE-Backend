const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')

class NotFoundError extends AppError {
    constructor(resource = 'Recurso', details = null) {
        super(`${resource} não encontrado!`, HTTP_STATUS.NOT_FOUND, {
            code: 'NOT_FOUND',
            isOperational: true,
            details,
        })
        this.name = 'NotFoundError'
    }
}

module.exports = NotFoundError