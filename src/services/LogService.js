const prisma = require('../config/prisma')

const LogService = {

    async register({ userId, boardId, action, entityType, entityId, oldValue = null, newValue = null }) {
        try {
            const formatValue = (val) => {
                if (val === null || val === undefined) return null
                if (typeof val === 'object') return JSON.stringify(val)
                return String(val)
            }

            return await prisma.activityLog.create({
                data: {
                    user_id: userId,
                    board_id: boardId,
                    action,
                    entity_type: entityType,
                    entity_id: parseInt(entityId),
                    old_value: formatValue(oldValue),
                    new_value: formatValue(newValue),
                }
            })
        } catch (error) {
            console.error('Falha crítica ao registrar log de atividade:', error)
        }
    },

    async getLogsByBoard(boardId) {

        //REVISAR, PROVAVELMENTE PRECISA DE PERMISSÃO E TALVEZ MOVER PARA BOARD!!!
        return await prisma.activityLog.findMany({
            where: { board_id: boardId },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 100
        })
    }

}

module.exports = LogService