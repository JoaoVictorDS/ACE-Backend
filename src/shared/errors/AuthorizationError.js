const AppError = require('./AppError')
const HTTP_STATUS = require('../constants/httpStatus')

class AuthorizationError extends AppError {
    constructor(message = 'Você não tem permissão para fazer isto!') {
        super(message, HTTP_STATUS.FORBIDDEN, {
            code: 'AUTHORIZATION_ERROR',
            isOperational: true,
        })
        this.name = 'AuthorizationError'
    }
}

module.exports = AuthorizationError