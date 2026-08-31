const prisma = require('../../config/prisma')
const PaginationService = require('../../shared/services/pagination.service')

const UndoRepository = {

    async create(data) {
        return prisma.undoAction.create({
            data
        })
    },

    async findById(undoActionId) {
        return prisma.undoAction.findUnique({ where: { id: undoActionId } })
    },

    async markConsumed(undoActionId) {
        return prisma.undoAction.update({
            where: { id: undoActionId },
            data: { consumed_at: new Date() }
        })
    },

    async findRecentForWorkspacePaginated(workspaceId, actorId = null, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        return prisma.undoAction.findMany({
            where: {
                workspace_id: workspaceId,
                consumed_at: null,
                expires_at: { gt: new Date() },
                ...(actorId && { actor_id: actorId })
            },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip
        })
    },

    async countByWorkspace(workspaceId, actorId = null) {
        return prisma.undoAction.count({
            where: {
                workspace_id: workspaceId,
                consumed_at: null,
                expires_at: { gt: new Date() },
                ...(actorId && { actor_id: actorId })
            }
        })
    },

    async findRecentForBoardPaginated(boardId, actorId = null, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        return prisma.undoAction.findMany({
            where: {
                board_id: boardId,
                consumed_at: null,
                expires_at: { gt: new Date() },
                ...(actorId && { actor_id: actorId })
            },
            orderBy: { created_at: 'desc' },
            take: limit,
            skip
        })
    },

    async countByBoard(boardId, actorId = null) {
        return prisma.undoAction.count({
            where: {
                board_id: boardId,
                consumed_at: null,
                expires_at: { gt: new Date() },
                ...(actorId && { actor_id: actorId })
            }
        })
    },

    async invalidatePendingUpdates(entityId, entityType, tx = null) {
        const client = tx || prisma

        return client.undoAction.updateMany({
            where: {
                entity_id: entityId,
                entity_type: entityType,
                action: 'UPDATE',
                consumed_at: null,
            },
            data: { consumed_at: new Date() }
        })
    },
}

module.exports = UndoRepository