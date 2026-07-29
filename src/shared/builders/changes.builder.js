/**
 * Changes
 *
 * Factory functions para construir o objeto `changes` do payload de forma padronizada.
 * Cada service constrói seu contexto de domínio (verificações, formatações) e
 * chama o factory correspondente — garantindo que o shape seja sempre o mesmo.
 *
 * Regra: Changes não contém lógica de domínio. Só cria o shape correto.
 */

const Changes = {

    // ─── Valores simples (TEXT, SELECT, DATE, NUMBER) ───────────────────────────
    // Não usar para colunas do tipo USER — usar os factories userCreated/Updated/Deleted

    /** Primeiro valor definido numa coluna */
    created: (after) => ({
        before: null,
        after,
    }),

    /** Valor alterado */
    updated: (before, after) => ({
        before,
        after,
    }),

    /** Valor removido */
    deleted: (before) => ({
        before,
        after: null,
    }),

    // ─── Campo nomeado de entidade (ex: title, description de Item) ─────────────

    /**
     * Atualização de um campo específico de entidade.
     * Usado em ITEM_UPDATED para que o dicionário gere mensagens ricas
     * ("renomeou de X para Y") em vez de mensagens genéricas.
     *
     * @param {string} field  - chave interna do campo (ex: 'title')
     * @param {string} label  - label legível (ex: 'título')
     * @param {*}      before - valor anterior
     * @param {*}      after  - valor novo
     */
    fieldUpdated: (field, label, before, after) => ({
        fields: [{ field, label, before, after }],
    }),

    /**
    * Múltiplas propriedades alteradas num mesmo update.
    * @param {{ field: string, label: string, before: *, after: * }[]} fiel1ds
    */
    fieldsUpdated: (fields) => ({ fields }),

    // ─── Coluna do tipo USER ────────────────────────────────────────────────────

    /** Primeira atribuição de usuários (coluna USER sem valor anterior) */
    userCreated: ({ after, addedUserIds }) => ({
        before: null,
        after,
        addedUserIds,
    }),

    /** Atribuições alteradas (adicionou e/ou removeu usuários) */
    userUpdated: ({ before, after, addedUserIds, removedUserIds }) => ({
        before,
        after,
        addedUserIds,
        removedUserIds,
    }),

    /** Todas as atribuições removidas */
    userDeleted: ({ before, removedUserIds }) => ({
        before,
        after: null,
        removedUserIds,
    }),

}

module.exports = Changes