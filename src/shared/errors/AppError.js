/**
 * 🔴 ERRO BASE DA APLICAÇÃO
 * 
 * Classe base para todos os erros operacionais da aplicação.
 * Fornece estrutura consistente para logging e responses HTTP.
 */

class AppError extends Error {
    /**
     * @param {string} message - Mensagem de erro
     * @param {number} statusCode - Código HTTP (padrão: 500)
     * @param {object} options - Opções adicionais
     * @param {string} options.code - Código único do erro
     * @param {boolean} options.isOperational - Se é erro esperado (padrão: true)
     * @param {any} options.details - Detalhes adicionais
     */
    constructor(message, statusCode = 500, options = {}) {
        super(message)
        this.name = 'AppError'
        this.statusCode = statusCode
        this.code = options.code || 'INTERNAL_ERROR'
        this.isOperational = options.isOperational !== false
        this.details = options.details || null
        this.timestamp = new Date().toISOString()

        Error.captureStackTrace(this, this.constructor)
    }

    getStatus() {
        return this.statusCode
    }

    getCode() {
        return this.code
    }

    isOperationalError() {
        return this.isOperational
    }

    toJSON() {
        return {
            status: this.isOperational ? 'error' : 'internal_error',
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            ...(this.details && { details: this.details }),
            ...(process.env.NODE_ENV === 'development' && {
                stack: this.stack,
                timestamp: this.timestamp,
            }),
        }
    }

    toLog() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            details: this.details,
            stack: this.stack,
            timestamp: this.timestamp,
        }
    }
}

module.exports = AppError
