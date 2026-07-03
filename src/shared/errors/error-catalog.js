/**
 * 📚 CATÁLOGO CENTRALIZADO DE ERROS
 * 
 * Uma única fonte da verdade para todas as mensagens de erro da aplicação.
 * Mantém concordância gramatical automática e é facilmente extensível.
 * 
 * Estrutura: { TIPO_RECURSO: { TIPO_ERRO: { status, code, message } } }
 */

const { getResourceMetadata } = require('../constants/resource-metadata')

// ─────────────────────────────────────────────────────────────────────
// 🔧 HELPERS - Funções auxiliares para concordância gramatical
// ─────────────────────────────────────────────────────────────────────

/**
 * Gera mensagem "não encontrado/encontrada" com concordância correta
 * @param {string} resourceKey - Ex: 'USER', 'BOARD', 'COLUMN'
 * @returns {string} Ex: "Usuário não encontrado" ou "Coluna não encontrada"
 */
const notFoundMessage = (resourceKey) => {
    const metadata = getResourceMetadata(resourceKey)
    if (!metadata) return 'Recurso não encontrado'

    const verb = metadata.gender === 'feminine' ? 'encontrada' : 'encontrado'
    return `${metadata.singular} não ${verb}`
}

/**
 * Gera mensagem de permissão negada com artigo correto
 * @param {string} resourceKey - Ex: 'USER', 'BOARD', 'COLUMN'
 * @returns {string} Ex: "Você não tem permissão para acessar este quadro"
 */
const unauthorizedMessage = (resourceKey) => {
    const metadata = getResourceMetadata(resourceKey)
    if (!metadata) return 'Você não tem permissão para acessar este recurso'

    const demonstrative = metadata.gender === 'feminine' ? 'esta' : 'este'
    return `Você não tem permissão para acessar ${demonstrative} ${metadata.singular.toLowerCase()}`
}

/**
 * Gera mensagem de não-membro com concordância
 * @param {string} resourceKey - Ex: 'BOARD'
 * @returns {string} Ex: "Você não é membro deste quadro"
 */
const notMemberMessage = (resourceKey) => {
    const metadata = getResourceMetadata(resourceKey)
    if (!metadata) return 'Você não é membro deste recurso'

    const demonstrative = metadata.gender === 'feminine' ? 'esta' : 'este'
    return `Você não é membro de ${demonstrative} ${metadata.singular.toLowerCase()}`
}

/**
 * Gera mensagem de ação proibida
 * @param {string} action - Ex: 'editar', 'deletar'
 * @param {string} resourceKey - Ex: 'BOARD' (opcional)
 * @returns {string} Ex: "Você não tem permissão para editar este quadro"
 */
const forbiddenActionMessage = (action, resourceKey) => {
    if (!resourceKey) return `Você não tem permissão para ${action}`

    const metadata = getResourceMetadata(resourceKey)
    if (!metadata) return `Você não tem permissão para ${action} este recurso`

    const demonstrative = metadata.gender === 'feminine' ? 'esta' : 'este'
    return `Você não tem permissão para ${action} ${demonstrative} ${metadata.singular.toLowerCase()}`
}

// ─────────────────────────────────────────────────────────────────────
// 📖 CATÁLOGO DE ERROS
// ─────────────────────────────────────────────────────────────────────

const ERROR_CATALOG = {
    // ═══════════════════════════════════════════════════════════════
    // 🔐 AUTENTICAÇÃO (401)
    // ═══════════════════════════════════════════════════════════════
    AUTHENTICATION: {
        FAILED: {
            status: 401,
            code: 'AUTHENTICATION_FAILED',
            message: 'Falha na autenticação. Por favor, faça login novamente',
        },
        INVALID_CREDENTIALS: {
            status: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'E-mail ou senha inválidos',
        },
        SESSION_EXPIRED: {
            status: 401,
            code: 'SESSION_EXPIRED',
            message: 'Sua sessão expirou. Por favor, faça login novamente',
        },
        TOKEN_NOT_PROVIDED: {
            status: 401,
            code: 'TOKEN_NOT_PROVIDED',
            message: 'Token não fornecido',
        },
        TOKEN_INVALID: {
            status: 401,
            code: 'TOKEN_INVALID',
            message: 'Token inválido',
        },
        TOKEN_EXPIRED: {
            status: 401,
            code: 'TOKEN_EXPIRED',
            message: 'Token expirado',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // 🚫 AUTORIZAÇÃO (403)
    // ═══════════════════════════════════════════════════════════════
    AUTHORIZATION: {
        FORBIDDEN: {
            status: 403,
            code: 'AUTHORIZATION_ERROR',
            message: 'Você não tem permissão para realizar esta ação',
        },
        FORBIDDEN_ACTION: (action, resourceKey) => ({
            status: 403,
            code: 'AUTHORIZATION_ERROR',
            message: forbiddenActionMessage(action, resourceKey),
        }),
        UNAUTHORIZED: (resourceKey) => ({
            status: 403,
            code: 'AUTHORIZATION_ERROR',
            message: unauthorizedMessage(resourceKey),
        }),
        NOT_MEMBER: (resourceKey) => ({
            status: 403,
            code: 'NOT_MEMBER',
            message: notMemberMessage(resourceKey),
        }),
        INSUFFICIENT_ROLE: (requiredRole, userRole) => ({
            status: 403,
            code: 'INSUFFICIENT_ROLE',
            message: `Role insuficiente. Requerido: ${requiredRole}, você tem: ${userRole}`,
        }),
        INSUFFICIENT_PERMISSIONS_FOR_SYSTEM_ADMIN: {
            status: 403,
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Apenas administradores do sistema podem realizar esta operação',
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 🔍 NÃO ENCONTRADO (404)
    // ═══════════════════════════════════════════════════════════════
    NOT_FOUND: {
        GENERIC: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Recurso não encontrado',
        },
        RESOURCE: (resourceKey) => ({
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage(resourceKey),
        }),
        USER: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('USER'),
        },
        WORKSPACE: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('WORKSPACE'),
        },
        BOARD: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('BOARD'),
        },
        SECTION: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('SECTION'),
        },
        COLUMN: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('COLUMN'),
        },
        ITEM: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('ITEM'),
        },
        ITEM_VALUE: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Valor do item não encontrado',
        },
        ITEM_UPDATE: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Atualização do item não encontrada',
        },
        COMMENT: {
            status: 404,
            code: 'NOT_FOUND',
            message: notFoundMessage('COMMENT'),
        },
        MEMBER: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Membro não encontrado',
        },
        WORKSPACE_MEMBER: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Membro da área de trabalho não encontrado',
        },
        BOARD_MEMBER: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Membro do quadro não encontrado',
        },
        ITEM_ASSIGNEE: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Atribuição do item não encontrada',
        },
        COLUMN_RESTRICTION: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Restrição de coluna não encontrada',
        },
        NOTIFICATION: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Notificação não encontrada',
        },
        NOTIFICATION_SETTING: {
            status: 404,
            code: 'NOT_FOUND',
            message: 'Configuração de notificação não encontrada',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ✔️ VALIDAÇÃO (400)
    // ═══════════════════════════════════════════════════════════════
    VALIDATION: {
        INVALID: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Erro na validação dos dados',
        },
        INVALID_FIELD: (field, predicate = 'é inválido') => ({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: `Campo '${field}' ${predicate}`,
        }),
        REQUIRED_FIELD: (field) => ({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: `Campo '${field}' é obrigatório`,
        }),
        INVALID_VALUE: (value, expectedType) => ({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: `O valor "${value}" não é válido para ${expectedType}`,
        }),
        INVALID_COLUMN_VALUE: (columnName, predicate) => ({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: `Coluna '${columnName}' ${predicate}`,
        }),
        INVALID_ROLE: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Role inválida',
        },
        INVALID_ENTITY_TYPE: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Tipo de entidade inválido',
        },
        INVALID_ACTION: (reason) => ({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: reason || 'Ação inválida',
        }),
        INVALID_DATA_TYPE: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Tipo de dados inválido para coluna',
        },
        MISSING_FORMULA_EXPRESSION: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Coluna tipo FORMULA requer uma expressão',
        },
        MISSING_SELECT_OPTIONS: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Coluna tipo SELECT requer opções',
        },
        INVALID_COLOR: {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Cor deve ser um valor hexadecimal válido (ex: #3b82f6)',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ⚠️ CONFLITO (409)
    // ═══════════════════════════════════════════════════════════════
    CONFLICT: {
        ALREADY_EXISTS: (field) => ({
            status: 409,
            code: 'CONFLICT',
            message: `${field} já existe`,
        }),
        ALREADY_IN_STATE: (resourceName, state) => ({
            status: 409,
            code: 'CONFLICT',
            message: `${resourceName} já está ${state}`,
        }),
        DUPLICATE_EMAIL: {
            status: 409,
            code: 'CONFLICT',
            message: 'E-mail já cadastrado',
        },
        DUPLICATE_USER_BOARD: {
            status: 409,
            code: 'CONFLICT',
            message: 'Usuário já é membro deste quadro',
        },
        DUPLICATE_USER_WORKSPACE: {
            status: 409,
            code: 'CONFLICT',
            message: 'Usuário já é membro desta área de trabalho',
        },
        DUPLICATE_ITEM_ASSIGNEE: {
            status: 409,
            code: 'CONFLICT',
            message: 'Usuário já está atribuído a este item nesta coluna',
        },
        DUPLICATE_NOTIFICATION_SETTING: {
            status: 409,
            code: 'CONFLICT',
            message: 'Configuração de notificação já existe',
        },
        RESOURCE_HAS_CONTENT: (resourceName, details) => ({
            status: 409,
            code: 'CONFLICT',
            message: `Não é possível excluir ${resourceName}: possui conteúdo vinculado${details ? ` (${details})` : ''}`,
        }),
        LAST_SYSTEM_ADMIN: {
            status: 409,
            code: 'LAST_SYSTEM_ADMIN',
            message: 'Não é possível remover o último administrador ativo do sistema',
        },
        SOLE_RESPONSIBLE: (dependentType, dependentNames) => ({
            status: 409,
            code: 'CONFLICT',
            message: `Operação negada: usuário é o único responsável por ${dependentType}: ${dependentNames}`,
        }),
    },

    // ═══════════════════════════════════════════════════════════════
    // 💥 ERRO INTERNO (500)
    // ═══════════════════════════════════════════════════════════════
    INTERNAL: {
        SERVER_ERROR: {
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'Ocorreu um erro interno no servidor',
        },
        NOT_IMPLEMENTED: {
            status: 500,
            code: 'NOT_IMPLEMENTED',
            message: 'Funcionalidade não implementada',
        },
        UNSUPPORTED_RESOURCE: (resourceKey) => ({
            status: 500,
            code: 'UNSUPPORTED_RESOURCE',
            message: `${resourceKey} não é suportado nesta operação`,
        }),
    },
}

// ─────────────────────────────────────────────────────────────────────
// 📤 EXPORTS
// ─────────────────────────────────────────────────────────────────────

module.exports = ERROR_CATALOG