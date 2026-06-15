const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')

class AuthenticationError extends AppError {
    constructor(messageOrType = null) {
        const ErrorMessages = require('./error-messages')

        let message

        switch (messageOrType?.toUpperCase?.()) {
            case 'SESSION_EXPIRED':
                message = ErrorMessages.sessionExpired()
                break
            case 'INVALID_CREDENTIALS':
                message = ErrorMessages.invalidCredentials()
                break
            case 'AUTHENTICATION_FAILED':
                message = ErrorMessages.authenticationFailed()
                break
            default:
                message = messageOrType || ErrorMessages.authenticationFailed()
        }

        super(message, HTTP_STATUS.UNAUTHORIZED, {
            code: 'AUTHENTICATION_ERROR',
            isOperational: true,
        })
        this.name = 'AuthenticationError'
    }
}

module.exports = AuthenticationError