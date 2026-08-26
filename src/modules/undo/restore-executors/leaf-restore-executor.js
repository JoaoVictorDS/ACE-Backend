const { NotFoundError } = require('../../../shared/errors')
const ERROR_CATALOG = require('../../../shared/errors/error-catalog')
const ItemRepository = require('../../item/item.repository')
const { TransactionManager } = require('../../../shared/database')

class LeafRestoreExecutor {

    constructor({
        repository,
        entityLabel,
        buildUpdateData = (snapshot) => snapshot.before,
        buildResource = LeafRestoreExecutor._defaultBuildResource,
        buildDeleteSummary = (cascadeResult, entityLabel) => `${entityLabel} restaurado(a)`,
        restoreCascade = null,
        reassignOrder = null,
        compactOrderOnDelete = null
    }) {
        this.repository = repository
        this.entityLabel = entityLabel
        this.buildUpdateData = buildUpdateData
        this.buildResource = buildResource
        this.buildDeleteSummary = buildDeleteSummary
        this.restoreCascade = restoreCascade
        this.reassignOrder = reassignOrder
        this.compactOrderOnDelete = compactOrderOnDelete
    }

    async restore(undoAction) {
        const { action, entity_id: entityId, snapshot } = undoAction

        switch (action) {
            case 'CREATE': return this._undoCreate(entityId)
            case 'DELETE': return this._undoDelete(entityId, snapshot)
            case 'UPDATE': return this._undoUpdate(entityId, snapshot)
            default: throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.GENERIC)
        }
    }

    async _undoCreate(entityId) {
        const record = this.compactOrderOnDelete
            ? await TransactionManager.run(async (tx) => {
                const deleted = await this.repository.softDelete(entityId, tx)
                await this.compactOrderOnDelete(deleted, tx)
                return deleted
            })
            : await this.repository.softDelete(entityId)

        return this._buildResult(record, 'Criação desfeita')
    }

    async _undoDelete(entityId, snapshot) {
        const needsTransaction = Boolean(this.restoreCascade || this.reassignOrder)
        if (!needsTransaction) {
            const record = await this.repository.restore(entityId)
            return this._buildResult(record, this.buildDeleteSummary(null, this.entityLabel))
        }

        let cascadeResult = null

        const record = await TransactionManager.run(async (tx) => {
            let restored = await this.repository.restore(entityId, tx)

            if (this.restoreCascade) cascadeResult = await this.restoreCascade(entityId, snapshot, tx)
            if (this.reassignOrder) restored = await this.reassignOrder(entityId, snapshot, tx)

            return restored
        })

        return this._buildResult(record, this.buildDeleteSummary(cascadeResult, this.entityLabel))
    }

    async _undoUpdate(entityId, snapshot) {
        const data = this.buildUpdateData(snapshot)
        const record = await this.repository.update(entityId, data)

        return this._buildResult(record, 'Edição desfeita')
    }

    async _buildResult(record, summary) {
        const { itemId, resource } = await this.buildResource(record)

        return { data: record, itemId, resource, summary }
    }

    static async _defaultBuildResource(record) {
        const { title: itemTitle } = await ItemRepository.findItemTitle(record.item_id)

        return {
            itemId: record.item_id,
            resource: { item: { id: record.item_id, title: itemTitle } },
        }
    }
}

module.exports = LeafRestoreExecutor