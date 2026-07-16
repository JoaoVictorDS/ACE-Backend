const RESOURCE_METADATA = {
    WORKSPACE: {
        singular: 'Área de trabalho',
        plural: 'Áreas de trabalho',
        gender: 'feminine',
        article: 'a',
        indefiniteArticle: 'uma'
    },

    BOARD: {
        singular: 'Quadro',
        plural: 'Quadros',
        gender: 'masculine',
        article: 'o',
        indefiniteArticle: 'um'
    },

    COLUMN: {
        singular: 'Coluna',
        plural: 'Colunas',
        gender: 'feminine',
        article: 'a',
        indefiniteArticle: 'uma'
    },

    SECTION: {
        singular: 'Seção',
        plural: 'Seções',
        gender: 'feminine',
        article: 'a',
        indefiniteArticle: 'uma'
    },

    ITEM: {
        singular: 'Item',
        plural: 'Itens',
        gender: 'masculine',
        article: 'o',
        indefiniteArticle: 'um'
    },

    ITEM_UPDATE: {
        singular: 'Atualização de item',
        plural: 'Atualizações de item',
        gender: 'feminine',
        article: 'a',
        indefiniteArticle: 'uma'
    },

    COMMENT: {
        singular: 'Comentário',
        plural: 'Comentários',
        gender: 'masculine',
        article: 'o',
        indefiniteArticle: 'um'
    },

    USER: {
        singular: 'Usuário',
        plural: 'Usuários',
        gender: 'masculine',
        article: 'o',
        indefiniteArticle: 'um'
    },

    ROLE: {
        singular: 'Cargo',
        plural: 'Cargos',
        gender: 'masculine',
        article: 'o',
        indefiniteArticle: 'um'
    },

    NOTIFICATION: {
        singular: 'Notificação',
        plural: 'Notificações',
        gender: 'feminine',
        article: 'a',
        indefiniteArticle: 'uma'
    },
}

/**
 * Busca metadados de um recurso
 * @param {string} resourceKey - Chave do recurso (BOARD, COLUMN, etc)
 * @returns {object|null} Metadados ou null
 */
function getResourceMetadata(resourceKey) {
    if (!resourceKey) return null
    return RESOURCE_METADATA[resourceKey.toUpperCase()] || null
}

module.exports = {
    RESOURCE_METADATA,
    getResourceMetadata
}