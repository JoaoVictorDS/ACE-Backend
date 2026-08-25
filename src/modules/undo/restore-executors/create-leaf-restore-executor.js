const { NotFoundError } = require('../../../shared/errors')
const ERROR_CATALOG = require('../../../shared/errors/error-catalog')
const ItemRepository = require('../../item/item.repository')

const createLeafRestoreExecutor = (repository, { entityLabel }) => ({

    async restore(undoAction) {
        const { action, entity_id: entityId, snapshot } = undoAction

        switch (action) {
            case 'CREATE': return this._undoCreate(entityId)
            case 'DELETE': return this._undoDelete(entityId)
            case 'UPDATE': return this._undoUpdate(entityId, snapshot)
            default: throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.GENERIC)
        }
    },

    async _undoCreate(entityId) {
        const record = await repository.softDelete(entityId)
        return this._buildResult(record, 'Criação desfeita')
    },

    async _undoDelete(entityId) {
        const record = await repository.restore(entityId)
        return this._buildResult(record, `${entityLabel} restaurado(a)`)
    },

    async _undoUpdate(entityId, snapshot) {
        const record = await repository.update(entityId, snapshot.before)
        return this._buildResult(record, 'Edição desfeita')
    },

    async _buildResult(record, summary) {
        const { title: itemTitle } = await ItemRepository.findItemTitle(record.item_id)

        return {
            data: record,
            itemId: record.item_id,
            resource: { item: { id: record.item_id, title: itemTitle } },
            summary,
        }
    },
})

module.exports = createLeafRestoreExecutor