const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')

class ValidationError extends AppError {
    constructor(message, details = null) {
        super(
            message || 'Erro na validação dos dados!',
            HTTP_STATUS.BAD_REQUEST,
            {
                code: 'VALIDATION_ERROR',
                isOperational: true,
                details,
            }
        )
        this.name = 'ValidationError'
    }
}

module.exports = ValidationError