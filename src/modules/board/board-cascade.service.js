const SectionRepository = require('../section/section.repository')
const ColumnRepository = require('../column/column.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const ItemRepository = require('../item/item.repository')
const ItemCascadeService = require('../item/item-cascade.service')

const BoardCascadeService = {

    async cascadeDelete(boardIds, timestamp, tx) {
        const ids = Array.isArray(boardIds) ? boardIds : [boardIds]

        const [affectedSections, affectedColumns, affectedItems] = await Promise.all([
            SectionRepository.findSectionIdsByBoards(ids, tx),
            ColumnRepository.findColumnIdsByBoards(ids, tx),
            ItemRepository.findItemIdsByBoards(ids, tx)
        ])

        const itemIds = affectedItems.map(i => i.id)

        await Promise.all([
            SectionRepository.softDeleteByBoards(ids, timestamp, tx),
            ColumnRepository.softDeleteByBoards(ids, timestamp, tx),
            ItemRepository.softDeleteByBoards(ids, timestamp, tx)
        ])

        const { commentIds, itemUpdateIds } = await ItemCascadeService.cascadeDelete(itemIds, timestamp, tx)

        return {
            sectionIds: affectedSections.map(s => s.id),
            columnIds: affectedColumns.map(c => c.id),
            itemIds,
            commentIds,
            itemUpdateIds,
        }
    },

    async restoreCascade(workspaceId, boardIds, snapshot, tx) {
        const ids = Array.isArray(boardIds) ? boardIds : [boardIds]
        const { sectionIds = [], columnIds = [], itemIds = [], commentIds = [], itemUpdateIds = [] } = snapshot.cascaded ?? {}

        await Promise.all([
            sectionIds.length ? SectionRepository.restoreMany(sectionIds, tx) : null,
            columnIds.length ? ColumnRepository.restoreMany(columnIds, tx) : null,
            itemIds.length ? ItemRepository.restoreMany(itemIds, tx) : null,
        ])

        await ItemCascadeService.restoreFromSnapshot({ commentIds, itemUpdateIds }, tx)

        let totalPromoted = 0
        for (const boardId of ids) {
            await this._reassignMemberOrders(workspaceId, boardId, tx)
            totalPromoted += await this._ensureBoardHasAdmin(workspaceId, boardId, tx)
        }

        return { promotedCount: totalPromoted }
    },

    async _reassignMemberOrders(workspaceId, boardId, tx) {
        const members = await BoardMemberRepository.findByBoard(boardId, tx)

        for (const member of members) {
            const newOrder = await BoardMemberRepository.findMaxOrderByWorkspace(member.user_id, workspaceId, tx)
            await BoardMemberRepository.updateMemberOrder(member.user_id, boardId, newOrder, tx)
        }
    },

    async _ensureBoardHasAdmin(workspaceId, boardId, tx) {
        const activeAdminsCount = await BoardMemberRepository.countActivePrivilegedMembers(boardId, tx)
        if (activeAdminsCount > 0) return 0

        const workspaceAdmins = await WorkspaceMemberRepository.findActiveByWorkspaceAndRoles(workspaceId, ['ADMIN', 'OWNER'], tx)

        for (const workspaceAdmin of workspaceAdmins) {
            const newOrder = await BoardMemberRepository.findMaxOrderByWorkspace(workspaceAdmin.user_id, workspaceId, tx)
            await BoardMemberRepository.upsertMember(workspaceAdmin.user_id, boardId, 'ADMIN', newOrder, tx)
        }

        return workspaceAdmins.length
    },
}

module.exports = BoardCascadeService