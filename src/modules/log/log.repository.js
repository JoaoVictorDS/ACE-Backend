const prisma = require('../../config/prisma')
const PaginationService = require('../../shared/services/pagination.service')

const LogRepository = {

    async create(data, tx = null) {
        const client = tx || prisma

        return client.activityLog.create({ data })
    },

    async countByWorkspace(workspaceId) {
        return prisma.activityLog.count({ where: { workspace_id: workspaceId } })
    },

    async countByBoard(boardId) {
        return prisma.activityLog.count({ where: { board_id: boardId } })
    },

    async findByWorkspacePaginated(workspaceId, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        return prisma.activityLog.findMany({
            where: { workspace_id: workspaceId },
            take: limit,
            skip,
            include: { actor: { select: { id: true, name: true, email: true } } },
            orderBy: { created_at: 'desc' },
        })
    },

    async findByBoardPaginated(boardId, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        return prisma.activityLog.findMany({
            where: { board_id: boardId },
            take: limit,
            skip,
            include: { actor: { select: { id: true, name: true, email: true } } },
            orderBy: { created_at: 'desc' },
        })
    },

    async countByEntityType(entityType) {
        return prisma.activityLog.count({
            where: { entity_type: entityType }
        })
    },

    async findByEntityTypePaginated(entityType, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        return prisma.activityLog.findMany({
            where: { entity_type: entityType },
            take: limit,
            skip,
            include: {
                actor: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' },
        })
    },

}

module.exports = LogRepository