const ItemAssigneeRepository = require('./item-assignee.repository')
const { splitIdList } = require('../../shared/utils')

const ItemAssigneeService = {

    /**
     * Sincroniza atribuições de usuários numa coluna do tipo USER.
     * @param {object} tx - Transação Prisma
     * @param {object} params
     * @param {number} params.itemId
     * @param {number} params.columnId
     * @param {string} params.oldValue - IDs antigos, separados por vírgula
     * @param {string} params.newValue - IDs novos, já validados
     */
    async sync(tx, { itemId, columnId, oldValue, newValue }) {
        const parseIds = (val) => splitIdList(val).map(id => parseInt(id)).filter(id => !isNaN(id))

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
            await ItemAssigneeRepository.assignUsers(itemId, columnId, idsToAdd, tx)
        }
    }

}

module.exports = ItemAssigneeService