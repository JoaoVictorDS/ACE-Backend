const PermissionService = require('../../shared/services/permission.service')
const ColumnService = require('../column/column.service')
const ItemAssigneeService = require('../item/item-assignee.service')
const LogService = require('../log/log.service')
const ItemValueRepository = require('./item-value.repository')
const ColumnRepository = require('../column/column.repository')
const UserRepository = require('../user/user.repository')
const TransactionManager = require('../../shared/database/TransactionManager')
const { NOTIFICATION_TYPES, RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { appEventEmitter, emitToRoom } = require('../../config')

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
        const isDeleting = sanitizedValue === ''
        const toDTO = (dbRecord) => ({
            item_id: itemId,
            column_id: columnId,
            value: dbRecord?.value || ''
        })

        if (isSameValue) return {
            action: 'UNCHANGED',
            data: toDTO(currentItemValue)
        }

        const result = await TransactionManager.run(async (tx) => {
            let record = null
            if (isDeleting) {
                await ItemValueRepository.delete(itemId, columnId, tx)
            } else {
                record = await ItemValueRepository.upsertValue(itemId, columnId, sanitizedValue, tx)
            }

            if (column.data_type === 'USER') {
                await ItemAssigneeService.sync(tx, {
                    itemId, boardId, columnId, oldValue, newValue: sanitizedValue
                })
            }

            return record
        })

        const itemTitle = currentItemValue?.item.title || ''
        let formattedOld = oldValue || 'vazio'
        let formattedNew = sanitizedValue || 'vazio'
        let notificationContent = { field: 'custom_column', label: column.name }

        if (column.data_type === 'USER') {
            const extractIds = (val) => val ? val.split(',').map(id => Number(id.trim())).filter(id => id > 0) : []
            const oldIds = extractIds(oldValue)
            const newIds = extractIds(sanitizedValue)
            const allIds = [...new Set([...oldIds, ...newIds])]

            let userMap = new Map()
            if (allIds.length > 0) {
                const fetchedUsers = await UserRepository.findByIds(allIds)
                userMap = new Map(fetchedUsers.map(u => [u.id, u.name]))
            }

            const formatUsers = (ids) => ids.map(id => userMap.get(id) || 'Usuário removido').join(', ')
            formattedOld = formatUsers(oldIds)
            formattedNew = formatUsers(newIds)

            notificationContent = {
                ...notificationContent,
                isAssignee: true,
                addedUserIds: newIds.filter(id => !oldIds.includes(id)),
                removedUserIds: oldIds.filter(id => !newIds.includes(id)),
                oldValue: formattedOld,
                newValue: formattedNew
            }
        } else {
            notificationContent = { ...notificationContent, oldValue: formattedOld, newValue: formattedNew }
        }

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: isDeleting ? 'DELETE' : (currentItemValue ? 'UPDATE' : 'CREATE'),
            entityType: 'ITEM_VALUE',
            entityId: itemId,
            oldValue: `${column.name}: ${formattedOld}`,
            newValue: `${column.name}: ${formattedNew}`
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            itemId,
            boardId,
            action: NOTIFICATION_TYPES.ITEM_UPDATED,
            content: {
                itemTitle,
                changes: notificationContent
            }
        })

        const response = {
            action: isDeleting ? 'DELETED' : (currentItemValue ? 'UPDATED' : 'CREATED'),
            data: toDTO(result)
        }

        emitToRoom(`board:${boardId}`, 'item_value:changed', {
            itemId, columnId, action: response.action, value: response.data.value
        })

        return response
    },

}

module.exports = ItemValueService