const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')

const PermissionService = {

    ROLES: {
        VIEW: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'],
        EDIT: ['OWNER', 'ADMIN', 'EDITOR'],
        ADMIN: ['OWNER', 'ADMIN'],
        OWNER: ['OWNER']
    },

    TYPES: {
        BOARD: 'BOARD',
        SECTION: 'SECTION',
        COLUMN: 'COLUMN',
        ITEM: 'ITEM'
    },
    LEVELS: {
        VIEW: 'VIEW',
        EDIT: 'EDIT',
        ADMIN: 'ADMIN',
        OWNER: 'OWNER'
    },

    async _resolveBoardContext(type, entityId) {
        let data

        switch (type.toUpperCase()) {
            case 'BOARD':
                data = await prisma.board.findUnique({
                    where: { id: entityId },
                    select: { id: true, workspace_id: true, creator_id: true }
                })
                break
            case 'SECTION':
            case 'COLUMN':
                data = await prisma[type.toLowerCase()].findUnique({
                    where: { id: entityId },
                    select: { board_id: true, board: { select: { workspace_id: true, creator_id: true } } }
                })
                break
            case 'ITEM':
                data = await prisma.item.findUnique({
                    where: { id: entityId },
                    select: {
                        section: { select: { board_id: true, board: { select: { workspace_id: true, creator_id: true } } } }
                    }
                })
                break
        }

        if (!data) throw new AppError(`${type} não encontrado!`, 404)

        if (type === 'BOARD') return {
            boardId: data.id,
            workspaceId: data.workspace_id,
            creatorId: data.creator_id
        }
        if (type === 'ITEM') return {
            boardId: data.section.board_id,
            workspaceId: data.section.board.workspace_id,
            creatorId: data.section.board.creator_id
        }

        return {
            boardId: data.board_id,
            workspaceId: data.board.workspace_id,
            creatorId: data.board.creator_id
        };
    },

    async checkPermission(type, entityId, user, actionLevel = 'EDIT') {
        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'

        const context = await this._resolveBoardContext(type, entityId)

        if (isSystemAdmin) return { ...context, role: 'OWNER' }

        const member = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: context.boardId } },
            select: { role: true }
        })
        const role = context.creatorId === userId ? 'OWNER' : (member?.role || null)
        const allowedRoles = this.ROLES[actionLevel.toUpperCase()]

        if (!role || !allowedRoles.includes(role)) throw new AppError(`Acesso negado: Permissão de ${actionLevel} insuficiente para este ${type}!`, 403)

        return {
            ...context,
            role,
        }
    },

    async checkWorkspacePermission(workspaceId, user, actionLevel = 'VIEW') {
        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                creator_id: true,
                workspace_members: {
                    where: { user_id: userId },
                    select: { role: true }
                }
            }
        })

        if (!workspace) throw new AppError('Área de Trabalho não encontrada!', 404)
        if (isSystemAdmin) return {
            boardId: null,
            workspaceId: workspace.id,
            creatorId: workspace.creator_id,
            role: 'OWNER'
        }

        const role = workspace.creator_id === userId ? 'OWNER' : (workspace.workspace_members[0]?.role || null)
        const allowedRoles = this.ROLES[actionLevel.toUpperCase()]

        if (!role || !allowedRoles.includes(role)) throw new AppError('Acesso negado à Área de Trabalho!', 403)

        return {
            creatorId: workspace.creator_id,
            role,
            workspaceId: workspace.id,
            boardId: null
        }
    }

}

module.exports = PermissionService