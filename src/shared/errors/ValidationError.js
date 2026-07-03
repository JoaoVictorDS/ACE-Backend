/**
 * ✔️ ERRO 400 - VALIDAÇÃO FALHOU
 * 
 * Lançado quando dados enviados pelo cliente não passam em validação.
 * Usa o catálogo centralizado de erros.
 */

const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')
const ERROR_CATALOG = require('./error-catalog')

class ValidationError extends AppError {
    /**
     * @param {object|string} errorDefinition - Definição do erro do catálogo ou mensagem customizada
     * @param {any} details - Detalhes adicionais do erro
     */
    constructor(errorDefinition, details = null) {
        let message, code

        if (typeof errorDefinition === 'string') {
            // Se for string, trata como mensagem customizada (compatibilidade com Zod)
            message = errorDefinition
            code = 'VALIDATION_ERROR'
        } else if (typeof errorDefinition === 'function') {
            // Se for função dinâmica, chama-a
            const resolved = errorDefinition()
            message = resolved.message
            code = resolved.code
        } else if (typeof errorDefinition === 'object' && errorDefinition !== null) {
            // Se for objeto estático
            message = errorDefinition.message
            code = errorDefinition.code
        } else {
            message = ERROR_CATALOG.VALIDATION.INVALID.message
            code = ERROR_CATALOG.VALIDATION.INVALID.code
        }

        super(message, HTTP_STATUS.BAD_REQUEST, {
            code,
            isOperational: true,
            details,
        })
        this.name = 'ValidationError'
    }
}

module.exports = ValidationError
