const AppError = require('../../shared/errors/AppError')

const ItemAssigneeService = {

    async sync(tx, { itemId, boardId, columnId, oldValue, newValue }) {
        const parseIds = (val) => {
            if (!val) return []
            return String(val).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        }
        const oldIds = parseIds(oldValue)
        const newIds = parseIds(newValue)
        const isSameIds = oldIds.length === newIds.length && oldIds.every(id => newIds.includes(id))

        if (isSameIds) return

        const idsToRemove = oldIds.filter(id => !newIds.includes(id))
        const idsToAdd = newIds.filter(id => !oldIds.includes(id))

        if (idsToRemove.length > 0) {
            await tx.itemAssignee.deleteMany({
                where: {
                    item_id: itemId,
                    column_id: columnId,
                    user_id: { in: idsToRemove }
                }
            })
        }
        if (idsToAdd.length > 0) {
            const members = await tx.boardMember.findMany({
                where: {
                    board_id: boardId,
                    user_id: { in: idsToAdd }
                },
                select: { user_id: true }
            })
            const validMembersIds = members.map(m => m.user_id)
            const invalidUsers = idsToAdd.filter(id => !validMembersIds.includes(id))

            if (invalidUsers.length > 0) throw new AppError(`Os seguintes usuários não pertencem ao quadro: ${invalidUsers.join(', ')}`, 400)

            await tx.itemAssignee.createMany({
                data: idsToAdd.map(userId => ({
                    item_id: itemId,
                    user_id: userId,
                    column_id: columnId
                })),
                skipDuplicates: true
            })
        }
    }

}

module.exports = ItemAssigneeService