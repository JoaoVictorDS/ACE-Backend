const BoardMemberService = require('../services/BoardMemberService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { upsertMemberSchema } = require('../validators/boardMemberValidator')

const BoardMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const result = upsertMemberSchema.safeParse({
            ...req.body,
            board_id: parseInt(req.params.boardId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { member_email, board_id, role } = result.data

        const member = await BoardMemberService.upsertMember({
            boardId: board_id,
            userId: req.user.id,
            memberEmail: member_email,
            role,
        })

        return res.status(200).json({
            message: 'Permissão de membro atualizada/adicionada com sucesso!',
            member
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        const members = await BoardMemberService.getMembersByBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(members)

    }),

    remove: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        const memberIdToRemove = parseInt(req.params.memberId)
        if (!memberIdToRemove || isNaN(memberIdToRemove)) return next(new AppError('O parâmetro "memberId" é obrigatório e deve ser number', 400))

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