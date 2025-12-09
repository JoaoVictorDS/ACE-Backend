const prisma = require('../config/prisma')

const ItemService = {
    async createItem({ sectionId, title, values = {} }) {
        if (!sectionId || !title) {
            throw new Error('ID da Seção e Título da Tarefa são obrigatórios!')
        }

        const result = await prisma.$transaction(async (tx) => {
            const lastItem = await tx.item.findFirst({
                where: { section_id: sectionId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const newOrder = lastItem ? lastItem.order + 1 : 0

            const newItem = await tx.item.create({
                data: {
                    section_id: sectionId,
                    title,
                    order: newOrder,
                },
            })

            const itemValuesToCreate = []
            for (const columnId in values) {
                const value = values[columnId]

                if (value !== null && value !== undefined && String(value).trim() !== '') {
                    itemValuesToCreate.push({
                        item_id: newItem.id,
                        column_id: parseInt(columnId),
                        value: String(value),
                    })
                }
            }

            let newCustomValues = []
            if (itemValuesToCreate.length > 0) {
                newCustomValues = await tx.itemValue.createMany({
                    data: itemValuesToCreate
                })
            }

            return { newItem, newCustomValues }
        })

        return result.newItem
    },

    async getItemByBoard(boardId) {
        if (!boardId) {
            throw new Error('ID do Quadro é obrigatório para listar tarefas!')
        }

        const itemsWithValuesQuery = `
            SELECT
                i.id AS item_id,
                i.title,
                i.section_id,

                jsonb_object_agg(
                    c.name,
                    iv.value
                ) AS custom_values
            FROM
                items i
            JOIN
                item_values iv ON i.id = iv.item_id
            JOIN
                columns c ON iv.column_id = c.id
            WHERE
                i.section_id IN (SELECT id FROM sections WHERE board_id = $1)
            GROUP BY
                i.id, i.title, i.section_id
            ORDER BY
                i.id ASC;
        
        `

        const rawItems = await prisma.$queryRawUnsafe(itemsWithValuesQuery, boardId)

        const sections = await prisma.section.findMany({
            where: { board_id: boardId },
            orderBy: { order: 'asc' },
            include: {
                items: {
                    orderBy: { id: 'asc' },
                    include: {
                        comments: {
                            select: {
                                id: true,
                                content: true,
                                created_at: true,
                                user: {
                                    select: {
                                        name: true,
                                        id: true
                                    }
                                }
                            },
                            orderBy: { created_at: 'asc' }
                        }
                    }
                }
            }
        })

        const finalSections = sections.map(section => ({
            ...section,
            items: section.items.map(item => {
                const pivotedValues = rawItems.find(r => r.item_id === item.id)?.custom_values || {}

                return {
                    ...item,
                    custom_values: pivotedValues,
                    comments: item.comments,
                }
            })
        }))

        return finalSections
    },

    async updateItem({ itemId, title, sectionId, values = {} }) {
        if (!itemId) {
            throw new Error('ID do Item é obrigatório para atualização!')
        }

        const numericSectionId = sectionId ? parseInt(sectionId) : undefined;

        return prisma.$transaction(async (tx) => {
            const updateItem = await tx.item.update({
                where: { id: itemId },
                data: {
                    ...(title && { title }),
                    ...(numericSectionId && { section_id: numericSectionId }),
                },
            })

            const transactions = []

            for (const columnIdStr in values) {
                const columnIdNum = parseInt(columnIdStr)
                const newValue = String(values[columnIdStr])

                const compoundKey = {
                    item_id: itemId,
                    column_id: columnIdNum,
                };

                const existingItemValue = await tx.itemValue.findUnique({
                    where: {
                        item_id_column_id: compoundKey,
                    },
                })

                if (existingItemValue) {
                    if (newValue.trim() === '') {
                        transactions.push(tx.itemValue.delete({
                            where: {
                                item_id_column_id: compoundKey,
                            }
                        }))
                    } else {
                        transactions.push(tx.itemValue.update({
                            where: {
                                item_id_column_id: compoundKey,
                            },
                            data: { value: newValue },
                        }))
                    }
                } else if (newValue.trim() !== '') {
                    transactions.push(tx.itemValue.create({
                        data: {
                            item_id: itemId,
                            column_id: columnIdNum,
                            value: newValue,
                        }
                    }))
                }
            }

            await Promise.all(transactions)

            return updateItem
        })
    },

    async deleteItem(itemId) {
        if (!itemId) {
            throw new Error('ID do Item é obrigatório para exclusão!')
        }

        const deleteItem = await prisma.item.delete({
            where: { id: itemId }
        })

        return deleteItem
    },

    async moveItem({ itemId, newSectionId, newOrder }) {
        if (!itemId || !newSectionId || newOrder === undefined) {
            throw new Error('ID do Item, ID da Nova Seção e Nova Ordem são obrigatórios para mover a tarefa!')
        }

        const numericNewSectionId = parseInt(newSectionId)
        const numericNewOrder = parseInt(newOrder)

        return prisma.$transaction(async (tx) => {
            const currentItem = await tx.item.findUnique({
                where: { id: itemId },
                select: { section_id: true, order: true }
            })

            if (!currentItem) {
                throw new Error('Tarefa não encontrada!')
            }

            const oldSectionId = currentItem.section_id
            const oldOrder = currentItem.order

            const transactions = []

            if (oldSectionId === numericNewSectionId) {
                if (numericNewOrder < oldOrder) {
                    transactions.push(tx.item.updateMany({
                        where: {
                            section_id: oldSectionId,
                            order: {
                                gte: numericNewOrder,
                                lt: oldOrder,
                            }
                        },
                        data: { order: { increment: 1 } }
                    }))
                } else if (numericNewOrder > oldOrder) {
                    transactions.push(tx.item.updateMany({
                        where: {
                            section_id: oldSectionId,
                            order: {
                                gt: oldOrder,
                                lte: numericNewOrder,
                            }
                        },
                        data: { order: { decrement: 1 } }
                    }))
                }
            } else {
                transactions.push(tx.item.updateMany({
                    where: {
                        section_id: oldSectionId,
                        order: { gt: oldOrder }
                    },
                    data: { order: { decrement: 1 } }
                }))

                transactions.push(tx.item.updateMany({
                    where: {
                        section_id: numericNewSectionId,
                        order: { gte: numericNewOrder }
                    },
                    data: { order: { increment: 1 } }
                }))
            }

            transactions.push(tx.item.update({
                where: { id: itemId },
                data: {
                    section_id: numericNewSectionId,
                    order: numericNewOrder,
                }
            }))

            await Promise.all(transactions)

            const updatedItem = await tx.item.findUnique({
                where: { id: itemId }
            })

            return updatedItem
        })
    },

}

module.exports = ItemService