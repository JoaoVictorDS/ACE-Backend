/**
 * 🔐 ERRO 401 - FALHA DE AUTENTICAÇÃO
 * 
 * Lançado quando autenticação falha (token inválido, expirado, credenciais erradas, etc).
 * Usa o catálogo centralizado de erros.
 */

const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')
const ERROR_CATALOG = require('./error-catalog')

class AuthenticationError extends AppError {
    /**
     * @param {object} errorDefinition - Definição do erro do catálogo
     * @param {any} details - Detalhes adicionais do erro
     */
    constructor(errorDefinition, details = null) {
        let message, code

        if (typeof errorDefinition === 'object' && errorDefinition !== null) {
            message = errorDefinition.message
            code = errorDefinition.code
        } else {
            message = ERROR_CATALOG.AUTHENTICATION.FAILED.message
            code = ERROR_CATALOG.AUTHENTICATION.FAILED.code
        }

        super(message, HTTP_STATUS.UNAUTHORIZED, {
            code,
            isOperational: true,
            details,
        })
        this.name = 'AuthenticationError'
    }
}

module.exports = AuthenticationError
