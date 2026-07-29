/**
 * ActionBuilder
 *
 * Constrói o record canônico de uma ação mutável,
 * produzindo os payloads corretos para LogService e NotificationService
 * a partir de uma única fonte de dados.
 *
 * Uso:
 *   const record = new ActionBuilder({ actor, workspaceId, boardId })
 *       .entity(ENTITY_TYPES.COMMENT, newComment.id)
 *       .forItem(itemId, itemTitle)
 *       .withAction('CREATE')
 *       .withChanges({ before: null, after: newComment.content })
 *       .build()
 *
 *   LogService.register(record)
 *   appEventEmitter.emit('item.action', record)
 */

const ACTION_SUFFIX = {
    CREATE: 'CREATED',
    UPDATE: 'UPDATED',
    DELETE: 'DELETED',
    MOVE: 'MOVED',
    RESTORE: 'RESTORED',
}

class ActionBuilder {

    constructor({ actor, workspaceId, boardId }) {
        this._actor = actor
        this._workspaceId = workspaceId
        this._boardId = boardId
        this._resource = { workspaceId, boardId }
    }

    /** Entidade diretamente afetada pela ação (Comment, ItemValue, etc.) */
    entity(entityId, entityType) {
        this._entityId = entityId
        this._entityType = entityType
        return this
    }

    /** Item ao qual a entidade pertence — base de toda navegação no frontend */
    forItem(id, title) {
        this._resource.item = { id, title }
        return this
    }

    /**
     * Ação base da operação.
     * Aceita ActivityAction ('CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RESTORE')
     * ou 'USER_MENTIONED' (notificação sem log correspondente).
     */
    withAction(baseAction) {
        this._baseAction = baseAction
        return this
    }

    /** O que mudou: before/after, addedUserIds/removedUserIds, field/label */
    withChanges(changes) {
        this._changes = changes
        return this
    }

    /** Contexto da coluna — obrigatório para ações em ITEM_VALUE */
    withColumn({ id, name, dataType }) {
        this._resource.column = { id, name, dataType }
        return this
    }

    /** Onde ocorreu a menção — obrigatório para USER_MENTIONED */
    withMentionSource(source) {
        this._resource.mentionSource = source
        return this
    }

    /** Estado completo pré-ação para suporte a undo — só persiste no Log */
    withSnapshot(snapshot) {
        this._snapshot = snapshot
        return this
    }

    build() {
        this._validate()

        const basePayload = {
            resource: this._resource,
            ...(this._changes && { changes: this._changes }),
        }

        return {
            // Campos de identidade compartilhados
            actor: this._actor,
            boardId: this._boardId,
            itemId: this._resource.item.id,
            entityType: this._entityType,
            entityId: this._entityId,
            baseAction: this._baseAction,

            // Para LogService.register()
            // null quando a ação não gera entrada de log (ex: USER_MENTIONED)
            logAction: this._resolveLogAction(),
            logPayload: {
                ...basePayload,
                ...(this._snapshot && { snapshot: this._snapshot }),
            },

            // Para appEventEmitter.emit('item.action', record)
            notificationAction: this._resolveNotificationAction(),
            notificationPayload: basePayload,
        }
    }

    // ─── Privados ───────────────────────────────────────────────────────────────

    _validate() {
        if (!this._entityType) throw new Error('ActionBuilder: .entity() é obrigatório')
        if (this._entityId == null) throw new Error('ActionBuilder: .entity() requer entityId')
        if (!this._baseAction) throw new Error('ActionBuilder: .withAction() é obrigatório')
        if (!this._resource.item) throw new Error('ActionBuilder: .forItem() é obrigatório')
    }

    _resolveLogAction() {
        if (this._baseAction === 'USER_MENTIONED') return null
        return this._baseAction
    }

    _resolveNotificationAction() {
        if (this._baseAction === 'USER_MENTIONED') return 'USER_MENTIONED'

        const suffix = ACTION_SUFFIX[this._baseAction]
        if (!suffix) throw new Error(`ActionBuilder: baseAction inválido — "${this._baseAction}"`)

        return `${this._entityType}_${suffix}`
    }
}

module.exports = ActionBuilder