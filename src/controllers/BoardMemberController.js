const BoardMemberService = require('../services/BoardMemberService')

const BoardMemberController = {

    async upsert(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id
        const { memberEmail, role } = req.body

        if (!boardId || !memberEmail || !role) return res.status(400).json({ error: 'ID do Quadro, E-mail do Membro e Cargo são obrigatórios!' })

        try {
            const member = await BoardMemberService.upsertMember({
                boardId,
                userId,
                memberEmail: memberEmail.toLowerCase().trim(),
                role: role.toUpperCase().trim(),
            })
            return res.status(200).json({
                message: 'Permissão de membro atualizada/adicionada com sucesso!',
                member
            })
        } catch (error) {
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id

        if (!boardId) return res.status(400).json({ error: 'ID do Quadro é obrigatório!' })

        try {
            const members = await BoardMemberService.getMembersByBoard({
                boardId,
                userId
            })
            return res.status(200).json(members)
        } catch (error) {
            const statusCode = error.message.includes('permissão') ? 403 : 500
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async remove(req, res) {
        const boardId = parseInt(req.params.boardId)
        const memberIdToRemove = parseInt(req.params.memberId)
        const userId = req.user.id

        if (!boardId || !memberIdToRemove) return res.status(400).json({ error: 'ID do Quadro e ID do Membro a ser removido são obrigatórios!' })

        try {
            await BoardMemberService.removeMember({
                boardId,
                userId,
                memberIdToRemove
            })
            return res.status(200).json({ message: 'Membro removido com sucesso!' })
        } catch (error) {
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

}

module.exports = BoardMemberController