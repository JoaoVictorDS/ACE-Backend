const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const BoardContextService = require('./BoardContextService')

const SectionService = {

    async createSection({ boardId, name, userId }) {
        await PermissionService.checkEditPermission(boardId, userId)

        const maxOrderSection = await prisma.section.findFirst({
            where: { board_id: boardId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const newOrder = maxOrderSection ? maxOrderSection.order + 1 : 0

        const newSection = await prisma.section.create({
            data: {
                board_id: boardId,
                name,
                order: newOrder,
            },
        })

        await LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'SECTION',
            entityId: newSection.id,
            newValue: name
        })

        return newSection
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
        const boardId = await BoardContextService.getBoardId(sectionId, 'SECTION')
        await PermissionService.checkEditPermission(boardId, userId)

        const oldSection = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true }
        })

        const updatedSection = await prisma.section.update({
            where: { id: sectionId },
            data: { name }
        })

        if (oldSection.name !== name) {
            await LogService.register({
                userId,
                boardId,
                action: 'UPDATE',
                entityType: 'SECTION',
                entityId: sectionId,
                oldValue: oldSection.name,
                newValue: name
            })
        }

        return updatedSection
    },

    async deleteSection({ sectionId, userId }) {
        const sectionToDelete = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { board_id: true, order: true, name: true }
        })

        if (!sectionToDelete) throw new Error('Seção não encontrada!')

        await PermissionService.checkEditPermission(sectionToDelete.board_id, userId)

        const result = await prisma.$transaction(async (tx) => {
            await tx.section.delete({
                where: { id: sectionId }
            })

            await tx.section.updateMany({
                where: {
                    board_id: sectionToDelete.board_id,
                    order: { gt: sectionToDelete.order }
                },
                data: {
                    order: { decrement: 1 },
                }
            })

            return { message: 'Seção excluída com sucesso!' }
        })

        await LogService.register({
            userId,
            boardId: sectionToDelete.board_id,
            action: 'DELETE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: sectionToDelete.name
        })

        return result
    },

    async moveSection({ sectionId, userId, newOrder }) {
        let oldState = {
            boardId: 0,
            order: 0
        }

        const currentSection = await prisma.section.findUnique({
            where: { id: sectionId },
            select: { board_id: true, order: true }
        })

        if (!currentSection) throw new Error('Seção não encontrada!')

        await PermissionService.checkEditPermission(currentSection.board_id, userId)

        oldState = {
            boardId: currentSection.board_id,
            order: currentSection.order
        }

        if (oldState.order === newOrder) return currentSection

        const updatedSection = await prisma.$transaction(async (tx) => {
            if (newOrder > oldState.order) {
                await tx.section.updateMany({
                    where: {
                        board_id: oldState.boardId,
                        order: {
                            gt: oldState.order,
                            lte: newOrder,
                        },
                    },
                    data: {
                        order: { decrement: 1 },
                    },
                })
            } else {
                await tx.section.updateMany({
                    where: {
                        board_id: oldState.boardId,
                        order: {
                            gte: newOrder,
                            lt: oldState.order,
                        },
                    },
                    data: {
                        order: { increment: 1 },
                    },
                })
            }

            return await tx.section.update({
                where: { id: sectionId },
                data: { order: newOrder },
            })
        })

        await LogService.register({
            userId,
            boardId: oldState.boardId,
            action: 'MOVE',
            entityType: 'SECTION',
            entityId: sectionId,
            oldValue: `Ordem: ${oldState.order}`,
            newValue: `Ordem: ${newOrder}`
        })

        return updatedSection
    },

}

module.exports = SectionService