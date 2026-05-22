const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const ColumnService = require('./ColumnService')
const ItemAssigneeService = require('./ItemAssigneeService')
const { NOTIFICATION_TYPES } = require('../constants')
const LogService = require('./LogService')
const appEventEmitter = require('../config/events')
const { emitToRoom } = require('../config/socket')

const ItemValueService = {

    async upsert({ user, itemId, columnId, value }) {
        const { workspaceId, boardId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.EDIT)
        const sanitizedValue = await ColumnService.validateValue(user, boardId, columnId, value)

        const [currentItemValue, column] = await Promise.all([
            prisma.itemValue.findUnique({
                where: { item_id_column_id: { item_id: itemId, column_id: columnId } },
                include: { item: { select: { title: true } } }
            }),
            prisma.column.findUnique({
                where: { id: columnId },
                select: { name: true, data_type: true, }
            })
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

        const result = await prisma.$transaction(async (tx) => {
            let record = null
            if (isDeleting) {
                await tx.itemValue.deleteMany({
                    where: { item_id: itemId, column_id: columnId }
                })
            } else {
                record = await tx.itemValue.upsert({
                    where: { item_id_column_id: { item_id: itemId, column_id: columnId } },
                    update: { value: sanitizedValue },
                    create: { item_id: itemId, column_id: columnId, value: sanitizedValue }
                })
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
                const fetchedUsers = await prisma.user.findMany({
                    where: { id: { in: allIds } },
                    select: { id: true, name: true }
                })
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

        emitToRoom(`board:${boardId}`, 'item_value:changed',
            {
                itemId, columnId, action: response.action, value: response.data.value

            })

        return response
    },

}

module.exports = ItemValueService