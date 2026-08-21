const BoardRepository = require('../board/board.repository')
const BoardCascadeService = require('../board/board-cascade.service')

const WorkspaceCascadeService = {

    async cascadeDelete(workspaceIds, timestamp, tx) {
        const ids = Array.isArray(workspaceIds) ? workspaceIds : [workspaceIds]

        const affectedBoards = await BoardRepository.findBoardIdsByWorkspaces(ids, tx)
        const boardIds = affectedBoards.map(b => b.id)

        await BoardRepository.softDeleteByWorkspaces(ids, timestamp, tx)

        const cascadedFromBoards = await BoardCascadeService.cascadeDelete(boardIds, timestamp, tx)

        return {
            boardIds,
            ...cascadedFromBoards,
        }
    },

}

module.exports = WorkspaceCascadeService