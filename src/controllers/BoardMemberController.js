const BoardMemberService = require('../services/BoardMemberService')
const catchAsync = require('../utils/catchAsync')
const { upsertMemberSchema, listMembersSchema, removeMemberSchema, leaveBoardSchema } = require('../validators/boardMemberValidator')

const BoardMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { member_email: memberEmail, board_id: boardId, ...otherFields } = upsertMemberSchema.parse({
            ...req.body,
            ...req.params
        })

        const boardMember = await BoardMemberService.upsert({
            user: req.user,
            boardId,
            memberEmail,
            ...otherFields
        })

        return res.status(200).json(boardMember)
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listMembersSchema.parse(req.params)

        const boardMembers = await BoardMemberService.getByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(boardMembers)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { board_id: boardId, member_id: memberIdToRemove } = removeMemberSchema.parse(req.params)

        await BoardMemberService.remove({
            user: req.user,
            boardId,
            memberIdToRemove
        })

        return res.status(204).send()
    }),

    leave: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = leaveBoardSchema.parse(req.params)

        await BoardMemberService.leave({
            user: req.user,
            boardId
        })

        return res.status(204).send()
    }),

}

module.exports = BoardMemberController