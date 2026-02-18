const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')

const SectionService = {

    async createSection({ boardId, name, userId }) {
        await PermissionService.checkEditPermission(boardId, userId)

        const result = await prisma.$transaction(async (tx) => {
            const maxOrderSection = await tx.section.findFirst({
                where: { board_id: boardId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const newOrder = maxOrderSection ? maxOrderSection.order + 1 : 0

            return await tx.section.create({
                data: {
                    board_id: boardId,
                    name,
                    order: newOrder,
                },
            })
        })

        LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'SECTION',
            entityId: result.id,
            newValue: name
        })

        return result
    },

    async getSectionsByBoard({ boardId, userId }) {
        await PermissionService.checkViewPermission(boardId, userId)

        const sections = await prisma.section.findMany({
            where: { board_id: boardId, },
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        })

        return sections
    },

    async updateSection({ sectionId, userId, name }) {
        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true, board_id: true }
        })
        if (!section) throw new Error('Seção não encontrada!')

        if (section.name === name) return section

        const boardId = section.board_id
        await PermissionService.checkEditPermission(boardId, userId)

        const updatedSection = await prisma.section.update({
            where: { id: sectionId },
            data: { name }
        })

        LogService.register({
            userId,
            boardId,
            action: 'UPDATE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: section.name,
            newValue: name
        })

        return updatedSection
    },

    async deleteSection({ sectionId, userId }) {
        const sectionToDelete = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { board_id: true, order: true, name: true }
        })
        if (!sectionToDelete) throw new Error('Seção não encontrada!')

        const boardId = sectionToDelete.board_id
        await PermissionService.checkEditPermission(boardId, userId)

        const result = await prisma.$transaction(async (tx) => {
            await tx.section.delete({
                where: { id: sectionId }
            })

            await tx.section.updateMany({
                where: {
                    board_id: boardId,
                    order: { gt: sectionToDelete.order }
                },
                data: {
                    order: { decrement: 1 },
                }
            })

            return { message: 'Seção excluída com sucesso!' }
        })

        LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: sectionToDelete.name
        })

        return result
    },

    async moveSection({ sectionId, userId, newOrder }) {
        const currentSection = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { board_id: true, order: true }
        })
        if (!currentSection) throw new Error('Seção não encontrada!')

        const boardId = currentSection.board_id
        await PermissionService.checkEditPermission(boardId, userId)

        const oldOrder = currentSection.order

        const totalSections = await prisma.section.count({
            where: {
                board_id: boardId
            }
        })
        const finalOrder = Math.max(0, Math.min(newOrder, totalSections - 1))

        if (oldOrder === finalOrder) return currentSection

        const result = await prisma.$transaction(async (tx) => {
            if (finalOrder > oldOrder) {
                await tx.section.updateMany({
                    where: {
                        board_id: boardId,
                        order: {
                            gt: oldOrder,
                            lte: finalOrder,
                        },
                    },
                    data: {
                        order: { decrement: 1 },
                    },
                })
            } else {
                await tx.section.updateMany({
                    where: {
                        board_id: boardId,
                        order: {
                            gte: finalOrder,
                            lt: oldOrder,
                        },
                    },
                    data: {
                        order: { increment: 1 },
                    },
                })
            }

            return await tx.section.update({
                where: { id: sectionId },
                data: { order: finalOrder },
            })
        })

        LogService.register({
            userId,
            boardId,
            action: 'MOVE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: `Ordem: ${oldOrder}`,
            newValue: `Ordem: ${newOrder}`
        })

        return result
    },

}

module.exports = SectionService