const { appEventEmitter, emitToRoom } = require('../../config')
const ColumnService = require('../column/column.service')
const ItemAssigneeService = require('../item/item-assignee.service')
const ItemValueRepository = require('./item-value.repository')
const ColumnRepository = require('../column/column.repository')
const UserRepository = require('../user/user.repository')
const ItemRepository = require('../item/item.repository')
const ItemValuePresenter = require('./item-value.presenter.js')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event.js')

const ItemValueService = {

    async upsert({ user, itemId, columnId, value }) {
        const { workspaceId, boardId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)

        const sanitizedValue = await ColumnService.validateValue(user, boardId, columnId, value)

        const [currentItemValue, column] = await Promise.all([
            ItemValueRepository.findByItemAndColumn(itemId, columnId),
            ColumnRepository.findByIdForValueValidation(columnId)
        ])

        const oldValue = currentItemValue?.value || ''
        const isSameValue = oldValue === sanitizedValue
        if (isSameValue) return {
            action: 'UNCHANGED',
            data: ItemValuePresenter.upsert({
                id: currentItemValue?.id,
                item_id: itemId,
                column_id: columnId,
                value: sanitizedValue,
                created_at: currentItemValue?.created_at,
                updated_at: currentItemValue?.updated_at
            })
        }
        const isDeleting = sanitizedValue === ''
        const action = isDeleting ? 'DELETE' : (currentItemValue ? 'UPDATE' : 'CREATE')
        const isUserColumn = column.data_type === 'USER'

        const result = await TransactionManager.run(async (tx) => {
            let record = null

            if (isDeleting) {
                await ItemValueRepository.delete(itemId, columnId, tx)
            } else {
                record = await ItemValueRepository.upsertValue(itemId, columnId, sanitizedValue, tx)
            }
            if (isUserColumn) {
                await ItemAssigneeService.sync(tx, {
                    itemId, boardId, columnId, oldValue, newValue: sanitizedValue
                })
            }

            return record
        })

        let changes

        if (isUserColumn) {
            const extractIds = (val) => val ? val.split(',').map(id => Number(id.trim())).filter(id => id > 0) : []
            const oldIds = extractIds(oldValue)
            const newIds = extractIds(sanitizedValue)
            const allIds = [...new Set([...oldIds, ...newIds])]

            let userMap = new Map()
            if (allIds.length > 0) {
                const fetchedUsers = await UserRepository.findByIds(allIds)
                userMap = new Map(fetchedUsers.map(u => [u.id, u.name]))
            }

            const formatUsers = (ids) => ids.map(id => userMap.get(id)).join(', ')
            const formattedOld = formatUsers(oldIds)
            const formattedNew = formatUsers(newIds)

            const addedUserIds = newIds.filter(id => !oldIds.includes(id))
            const removedUserIds = oldIds.filter(id => !newIds.includes(id))

            changes = {
                before: oldValue || null,
                after: sanitizedValue || null,
                addedUserIds: newIds.filter(id => !oldIds.includes(id)),
                removedUserIds: oldIds.filter(id => !newIds.includes(id)),
            }
        } else {
            changes = {
                before: oldValue || null,
                after: sanitizedValue || null,
            }
        }

        const { title } = await ItemRepository.findItemTitle(itemId)
        const entityId = result?.id ?? currentItemValue?.id

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId,
            boardId,
            itemId,
            entityType: ENTITY_TYPES.ITEM_VALUE,
            entityId,
            action,
            resource: {
                workspaceId,
                boardId,
                item: { id: itemId, title },
                column: { id: columnId, name: column.name, dataType: column.data_type },
            },
            changes,
        })

        const response = {
            action,
            data: ItemValuePresenter.upsert({
                id: entityId,
                item_id: itemId,
                column_id: columnId,
                value: sanitizedValue,
                created_at: result?.created_at ?? currentItemValue.created_at,
                updated_at: result?.updated_at ?? currentItemValue.updated_at,
            })
        }

        emitToRoom(`board:${boardId}`, 'item_value:changed', response.data)

        return response
    },

}

module.exports = ItemValueService