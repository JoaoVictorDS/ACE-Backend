const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../constants')
const LogService = require('./LogService')
const { emitToRoom } = require('../config/socket')
const AppError = require('../errors/AppError')

const SectionService = {

    async create({ user, boardId, name }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

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
            userId: user.id,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'SECTION',
            entityId: result.id,
            newValue: `Seção criada: ${name}`
        })

        emitToRoom(`board:${boardId}`, 'section:created', result)

        return result
    },

    async getByBoard({ user, boardId }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)

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

    async update({ user, sectionId, name }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.ADMIN)

        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true }
        })
        if (!section) throw new AppError('Seção não encontrada!', 404)

        const isSameName = section.name === name

        if (isSameName) return section

        const updatedSection = await prisma.section.update({
            where: { id: sectionId },
            data: { name }
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: `Nome: ${section.name}`,
            newValue: `Nome: ${name}`
        })

        emitToRoom(`board:${boardId}`, 'section:updated', updatedSection)

        return updatedSection
    },

    async delete({ user, sectionId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.ADMIN)

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
            userId: user.id,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: `Seção removida: ${sectionToDelete.name}`
        })

        emitToRoom(`board:${boardId}`, 'section:deleted', { sectionId })

        return result
    },

    async move({ user, sectionId, newOrder }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.SECTION, sectionId, user, PERMISSION_LEVELS.ADMIN)

        const currentSection = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { order: true }
        })
        if (!currentSection) throw new AppError('Seção não encontrada!', 404)

        const oldOrder = currentSection.order

        const totalSections = await prisma.section.count({
            where: { board_id: boardId }
        })
        const finalOrder = Math.max(0, Math.min(newOrder, totalSections - 1))
        const isSamePosition = oldOrder === finalOrder

        if (isSamePosition) return currentSection

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
            userId: user.id,
            workspaceId,
            boardId,
            action: 'MOVE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: `Ordem: ${oldOrder}`,
            newValue: `Ordem: ${newOrder}`
        })

        emitToRoom(`board:${boardId}`, 'section:moved', result)

        return result
    },
}

module.exports = SectionService