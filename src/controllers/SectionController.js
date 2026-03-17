const SectionService = require('../services/SectionService')
const catchAsync = require('../utils/catchAsync')
const { createSectionSchema, updateSectionSchema, moveSectionSchema, deleteSectionSchema, listSectionsSchema } = require('../validators/sectionValidator')

const SectionController = {

    create: catchAsync(async (req, res, next) => {
        const { board_id: boardId, ...otherFields } = createSectionSchema.parse({
            ...req.body,
            ...req.params
        })

        const section = await SectionService.createSection({
            boardId,
            ...otherFields,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Seção criada com sucesso!',
            section
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listSectionsSchema.parse(req.params)

        const sections = await SectionService.getSectionsByBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(sections)
    }),

    update: catchAsync(async (req, res, next) => {
        const { section_id: sectionId, ...otherFields } = updateSectionSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedSection = await SectionService.updateSection({
            sectionId,
            userId: req.user.id,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Seção atualizada com sucesso!',
            updatedSection
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { section_id: sectionId, force } = deleteSectionSchema.parse({
            ...req.params,
            ...req.query
        })

        await SectionService.deleteSection({
            sectionId,
            userId: req.user.id,
            force
        })

        return res.status(200).json({
            message: 'Seção excluída com sucesso!'
        })
    }),

    move: catchAsync(async (req, res, next) => {
        const { new_order: newOrder, section_id: sectionId } = moveSectionSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedSection = await SectionService.moveSection({
            sectionId,
            userId: req.user.id,
            newOrder
        })

        return res.status(200).json({
            message: 'Ordem da seção atualizada com sucesso!',
            movedSection
        })
    }),

}

module.exports = SectionController