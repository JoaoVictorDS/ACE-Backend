const BoardMemberService = require('./board-member.service')
const catchAsync = require('../../shared/utils/catchAsync')

const BoardMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params
        const { member_email: memberEmail, role } = req.validated.body

        const boardMember = await BoardMemberService.upsert({
            user: req.user,
            boardId,
            memberEmail,
            role
        })

        return res.status(200).json(boardMember)
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params

        const boardMembers = await BoardMemberService.getByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(boardMembers)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { board_id: boardId, member_id: memberIdToRemove } = req.validated.params

        await BoardMemberService.remove({
            user: req.user,
            boardId,
            memberIdToRemove
        })

        return res.status(204).send()
    }),

    leave: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.validated.params

        await BoardMemberService.leave({
            user: req.user,
            boardId
        })

        return res.status(204).send()
    }),

}

module.exports = BoardMemberController