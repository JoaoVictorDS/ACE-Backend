/**
 * ⚠️ ERRO 409 - CONFLITO
 * 
 * Lançado quando há conflito (recurso já existe, violação de unicidade, etc).
 * Usa o catálogo centralizado de erros.
 */

const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')

class ConflictError extends AppError {
    /**
     * @param {object|function} errorDefinition - Definição do erro do catálogo
     * @param {any} details - Detalhes adicionais do erro
     */
    constructor(errorDefinition, details = null) {
        let message, code

        if (typeof errorDefinition === 'function') {
            // Se for função dinâmica, chama-a
            const resolved = errorDefinition()
            message = resolved.message
            code = resolved.code
        } else if (typeof errorDefinition === 'object' && errorDefinition !== null) {
            // Se for objeto estático
            message = errorDefinition.message
            code = errorDefinition.code
        } else {
            message = 'Conflito nos dados fornecidos'
            code = 'CONFLICT'
        }

        super(message, HTTP_STATUS.CONFLICT, {
            code,
            isOperational: true,
            details,
        })
        this.name = 'ConflictError'
    }
}

module.exports = ConflictError