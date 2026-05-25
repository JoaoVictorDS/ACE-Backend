const BaseRepository = require('./BaseRepository')

class SectionRepository extends BaseRepository {

    constructor() {
        super('section')
    }

    /**
    * Busca section por ID para verificar permissão
    * @param {number} sectionId - ID da section
    * @returns {Promise<object>} Section ou null
    */
    async findPermissionContext(sectionId) {
        return await this.findById(sectionId, {
            select: {
                board_id: true,
                board: { select: { workspace_id: true, creator_id: true } }
            }
        })
    }

}

module.exports = SectionRepository