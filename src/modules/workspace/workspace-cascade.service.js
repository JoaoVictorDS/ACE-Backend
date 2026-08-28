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

    async restoreCascade(workspaceId, snapshot, tx) {
        const { boardIds = [] } = snapshot.cascaded ?? {}

        if (boardIds.length) await BoardRepository.restoreMany(boardIds, tx)

        return BoardCascadeService.restoreCascade(workspaceId, boardIds, snapshot, tx)
    }

}

module.exports = WorkspaceCascadeService