const BoardMemberService = require('../services/BoardMemberService')
const catchAsync = require('../utils/catchAsync')
const { upsertMemberSchema, listMembersSchema, removeMemberSchema, leaveBoardSchema } = require('../validators/boardMemberValidator')

const BoardMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { member_email: memberEmail, board_id: boardId, ...otherFields } = upsertMemberSchema.parse({
            ...req.body,
            ...req.params
        })

        const boardMember = await BoardMemberService.upsertMember({
            user: req.user,
            boardId,
            memberEmail,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Permissão de membro atualizada/adicionada com sucesso!',
            boardMember
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listMembersSchema.parse(req.params)

        const boardMembers = await BoardMemberService.getMembersByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(boardMembers)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { board_id: boardId, member_id: memberIdToRemove } = removeMemberSchema.parse(req.params)

        await BoardMemberService.removeMember({
            user: req.user,
            boardId,
            memberIdToRemove
        })

        return res.status(200).json({
            message: 'Membro removido com sucesso!'
        })
    }),

    leave: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = leaveBoardSchema.parse(req.params)

        await BoardMemberService.leaveBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json({
            message: 'Você saiu do quadro com sucesso!'
        })
    }),

}

module.exports = BoardMemberController