/**
 * 🔍 ERRO 404 - RECURSO NÃO ENCONTRADO
 * 
 * Lançado quando um recurso solicitado não existe.
 * Usa o catálogo centralizado de erros para mensagens consistentes.
 */

const AppError = require('./AppError')
const { HTTP_STATUS } = require('../constants')
const ERROR_CATALOG = require('./error-catalog')

class NotFoundError extends AppError {
    /**
     * @param {object|string} errorDefinition - Definição do erro do catálogo ou mensagem customizada
     * @param {any} details - Detalhes adicionais do erro
     */
    constructor(errorDefinition, details = null) {
        let message, code

        // Se for string, trata como mensagem customizada (compatibilidade)
        if (typeof errorDefinition === 'string') {
            message = errorDefinition
            code = 'NOT_FOUND'
        } else if (typeof errorDefinition === 'object' && errorDefinition !== null) {
            // Se for função (dinâmica), chama com parâmetros se necessário
            if (typeof errorDefinition === 'function') {
                const resolved = errorDefinition()
                message = resolved.message
                code = resolved.code
            } else {
                // Se for objeto estático do catálogo
                message = errorDefinition.message
                code = errorDefinition.code
            }
        } else {
            message = 'Recurso não encontrado'
            code = 'NOT_FOUND'
        }

        super(message, HTTP_STATUS.NOT_FOUND, {
            code,
            isOperational: true,
            details,
        })
        this.name = 'NotFoundError'
    }
}

module.exports = NotFoundError
