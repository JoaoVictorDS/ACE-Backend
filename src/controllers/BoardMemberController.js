const BoardMemberService = require('../services/BoardMemberService')
const catchAsync = require('../utils/catchAsync')
const { upsertMemberSchema, listMembersSchema, removeMemberSchema } = require('../validators/boardMemberValidator')

const BoardMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { member_email: memberEmail, board_id: boardId, ...otherFields } = upsertMemberSchema.parse({
            ...req.body,
            ...req.params
        })

        const boardMember = await BoardMemberService.upsertMember({
            boardId,
            userId: req.user.id,
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
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(boardMembers)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { board_id: boardId, member_id: memberIdToRemove } = removeMemberSchema.parse(req.params)

        await BoardMemberService.removeMember({
            boardId,
            userId: req.user.id,
            memberIdToRemove
        })

        return res.status(200).json({
            message: 'Membro removido com sucesso!'
        })
    }),

}

module.exports = BoardMemberController