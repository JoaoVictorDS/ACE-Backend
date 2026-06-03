const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')

class AuthenticationError extends AppError {
    constructor(message = 'Falha na autenticação!') {
        super(message, HTTP_STATUS.UNAUTHORIZED, {
            code: 'AUTHENTICATION_ERROR',
            isOperational: true,
        })
        this.name = 'AuthenticationError'
    }
}

module.exports = AuthenticationError