const { getResourceMetadata } = require('../constants/resource-metadata')

const ErrorMessages = {

    /**
     * Mensagem: recurso não encontrado com concordância correta
     * @param {string} resourceKey - Chave do recurso (BOARD, COLUMN, etc)
     * @returns {string} Ex: "Coluna não encontrada"
     */
    notFound(resourceKey) {
        const metadata = getResourceMetadata(resourceKey)

        if (!metadata) {
            return 'Recurso não encontrado'
        }

        const verb = metadata.gender === 'feminine' ? 'encontrada' : 'encontrado'
        return `${metadata.singular} não ${verb}`
    },

    /**
     * Mensagem: recurso não encontrado (formato alternativo com artigo)
     * @param {string} resourceKey
     * @returns {string} Ex: "A coluna não foi encontrada"
     */
    notFoundWithArticle(resourceKey) {
        const metadata = getResourceMetadata(resourceKey)

        if (!metadata) {
            return 'O recurso não foi encontrado'
        }

        const verb = metadata.gender === 'feminine' ? 'encontrada' : 'encontrado'
        return `${metadata.article} ${metadata.singular.toLowerCase()} não foi ${verb}`
    },

    /**
     * Mensagem: acesso negado/não autorizado
     * @param {string} resourceKey - Chave do recurso (opcional)
     * @returns {string} Ex: "Você não tem permissão para acessar este quadro"
     */
    unauthorized(resourceKey = null) {
        if (!resourceKey) {
            return 'Você não tem permissão para realizar esta ação'
        }

        const metadata = getResourceMetadata(resourceKey)

        if (!metadata) {
            return 'Você não tem permissão para acessar este recurso'
        }

        // "este" para masculino, "esta" para feminino
        const demonstrative = metadata.gender === 'feminine' ? 'esta' : 'este'
        return `Você não tem permissão para acessar ${demonstrative} ${metadata.singular.toLowerCase()}`
    },

    /**
     * Mensagem: usuário não autorizado (não é membro)
     * @param {string} resourceKey
     * @returns {string} Ex: "Você não é membro deste quadro"
     */
    notMember(resourceKey) {
        const metadata = getResourceMetadata(resourceKey)

        if (!metadata) {
            return 'Você não é membro deste recurso'
        }

        const demonstrative = metadata.gender === 'feminine' ? 'esta' : 'este'
        return `Você não é membro de ${demonstrative} ${metadata.singular.toLowerCase()}`
    },

    /**
     * Mensagem: falta de permissão para uma ação específica
     * @param {string} action - Ação (criar, editar, deletar, etc)
     * @param {string} resourceKey - Chave do recurso (opcional)
     * @returns {string} Ex: "Você não tem permissão para editar este quadro"
     */
    forbiddenAction(action, resourceKey = null) {
        if (!resourceKey) {
            return `Você não tem permissão para ${action}`
        }

        const metadata = getResourceMetadata(resourceKey)

        if (!metadata) {
            return `Você não tem permissão para ${action} este recurso`
        }

        const demonstrative = metadata.gender === 'feminine' ? 'esta' : 'este'
        return `Você não tem permissão para ${action} ${demonstrative} ${metadata.singular.toLowerCase()}`
    },

    /**
     * Mensagem: recurso não suportado/tipo inválido
     * @param {string} resourceKey
     * @returns {string}
     */
    unsupportedResource(resourceKey) {
        const metadata = getResourceMetadata(resourceKey)

        if (!metadata) {
            return `Tipo de recurso "${resourceKey}" não é suportado`
        }

        return `${metadata.singular} não é suportado nesta operação`
    },

    /**
     * Mensagem: validação falhou
     * @param {string} field - Campo (nome, email, etc)
     * @param {string} reason - Motivo (obrigatório, formato inválido, etc)
     * @returns {string} Ex: "Campo 'nome' é obrigatório"
     */
    validationFailed(field, reason = 'inválido') {
        return `Campo '${field}' é ${reason}`
    },

    /**
     * Mensagem: valor inválido para um tipo
     * @param {string} value - Valor recebido
     * @param {string} expectedType - Tipo esperado
     * @returns {string}
     */
    invalidValue(value, expectedType) {
        return `O valor "${value}" não é válido para ${expectedType}`
    },

    /**
     * Mensagem: operação não permitida por restrição
     * @param {string} reason - Motivo da restrição
     * @returns {string}
     */
    operationForbidden(reason) {
        return `Operação não permitida: ${reason}`
    },

    /**
     * Mensagem: erro de autenticação
     * @returns {string}
     */
    authenticationFailed() {
        return 'Falha na autenticação. Por favor, faça login novamente'
    },

    /**
     * Mensagem: sessão expirada
     * @returns {string}
     */
    sessionExpired() {
        return 'Sua sessão expirou. Por favor, faça login novamente'
    },

    /**
     * Mensagem: credenciais inválidas
     * @returns {string}
     */
    invalidCredentials() {
        return 'E-mail ou senha inválidos'
    },

    /**
     * Mensagem: conflito (resource já existe, etc)
     * @param {string} field - Campo em conflito
     * @returns {string}
     */
    conflict(field) {
        return `${field} já existe`
    }
}

module.exports = ErrorMessages