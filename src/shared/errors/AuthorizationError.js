const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')

class AuthorizationError extends AppError {
    constructor(messageOrResourceKey = null, options = {}) {
        const ErrorMessages = require('./error-messages')

        let message

        if (!messageOrResourceKey) {
            message = 'Você não tem permissão para realizar esta ação'
        } else if (/^[A-Z_]+$/.test(messageOrResourceKey)) {
            message = ErrorMessages.unauthorized(messageOrResourceKey)
        } else {
            message = messageOrResourceKey
        }

        super(message, HTTP_STATUS.FORBIDDEN, {
            code: 'AUTHORIZATION_ERROR',
            isOperational: true,
            details: options.details || null,
        })
        this.name = 'AuthorizationError'
    }
}

module.exports = AuthorizationError