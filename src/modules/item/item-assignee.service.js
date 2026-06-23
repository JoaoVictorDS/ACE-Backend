const BoardMemberRepository = require('../board-member/board-member.repository')
const ItemAssigneeRepository = require('./item-assignee.repository')
const { AppError } = require('../../shared')

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
            await ItemAssigneeRepository.removeAssignments(itemId, columnId, idsToRemove, tx)
        }
        if (idsToAdd.length > 0) {
            const members = await BoardMemberRepository.findValidMemberIds(boardId, idsToAdd, tx)
            const validMembersIds = members.map(m => m.user_id)
            const invalidUsers = idsToAdd.filter(id => !validMembersIds.includes(id))
            if (invalidUsers.length > 0) throw new AppError(`Os seguintes usuários não pertencem ao quadro: ${invalidUsers.join(', ')}`, 400)
            await ItemAssigneeRepository.assignUsers(itemId, columnId, idsToAdd, tx)
        }
    }

}

module.exports = ItemAssigneeService