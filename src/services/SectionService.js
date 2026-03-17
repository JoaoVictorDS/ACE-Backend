const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const SectionService = {

    async createSection({ boardId, name, userId }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.ADMIN)

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
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'SECTION',
            entityId: result.id,
            newValue: name
        })

        return result
    },

    async getSectionsByBoard({ boardId, userId }) {
        await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.VIEW)

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
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.SECTION, sectionId, userId, PermissionService.LEVELS.ADMIN)

        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true }
        })
        if (!section) throw new AppError('Seção não encontrada!', 404)
        if (section.name === name) return section

        const updatedSection = await prisma.section.update({
            where: { id: sectionId },
            data: { name }
        })

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: section.name,
            newValue: name
        })

        return updatedSection
    },

    async deleteSection({ sectionId, userId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.SECTION, sectionId, userId, PermissionService.LEVELS.ADMIN)

        const sectionToDelete = await prisma.section.findUnique({
            where: { id: sectionId },
            select: {
                order: true, name: true,
                _count: { select: { items: true } }
            }
        })
        if (!sectionToDelete) throw new AppError('Seção não encontrada!', 404)

        const { items } = sectionToDelete._count
        const hasContent = items > 0
        if (!force && hasContent) throw new AppError(`Não é possível excluir a seção: existem ${items} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir!`, 409)

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
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: sectionToDelete.name
        })

        return result
    },

    async moveSection({ sectionId, userId, newOrder }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.SECTION, sectionId, userId, PermissionService.LEVELS.ADMIN)

        const currentSection = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { order: true }
        })
        if (!currentSection) throw new AppError('Seção não encontrada!', 404)

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
            workspaceId,
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