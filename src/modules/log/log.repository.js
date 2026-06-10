const { prisma } = require('../../config')
const PaginationService = require('../../shared/services/pagination.service')

const LogRepository = {

    async create(data, tx = null) {
        const client = tx || prisma
        return client.activityLog.create({ data })
    },

    async findByWorkspacePaginated(workspaceId, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        const [data, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: { workspace_id: workspaceId },
                take: limit,
                skip,
                include: { user: { select: { name: true, email: true } } },
                orderBy: { created_at: 'desc' },
            }),
            prisma.activityLog.count({ where: { workspace_id: workspaceId } })
        ])

        return {
            data,
            total
        }
    },

    async findByBoardPaginated(boardId, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        const [data, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: { board_id: boardId },
                take: limit,
                skip,
                include: { user: { select: { name: true, email: true } } },
                orderBy: { created_at: 'desc' },
            }),
            prisma.activityLog.count({ where: { board_id: boardId } })
        ])

        return {
            data,
            total
        }
    },

}

module.exports = LogRepository