const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')

class NotFoundError extends AppError {
    constructor(resourceKey = 'Recurso', details = null) {
        const ErrorMessages = require('./error-messages')

        const message = /^[A-Z_]+$/.test(resourceKey)
            ? ErrorMessages.notFound(resourceKey)
            : resourceKey

        super(message, HTTP_STATUS.NOT_FOUND, {
            code: 'NOT_FOUND',
            isOperational: true,
            details,
        })
        this.name = 'NotFoundError'
    }
}

module.exports = NotFoundError