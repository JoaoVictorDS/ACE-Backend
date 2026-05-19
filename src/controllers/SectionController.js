const SectionService = require('../services/SectionService')
const catchAsync = require('../utils/catchAsync')
const { createSectionSchema, updateSectionSchema, moveSectionSchema, deleteSectionSchema, listSectionsSchema } = require('../validators/sectionValidator')

const SectionController = {

    create: catchAsync(async (req, res, next) => {
        const { board_id: boardId, ...otherFields } = createSectionSchema.parse({
            ...req.body,
            ...req.params
        })

        const section = await SectionService.create({
            user: req.user,
            boardId,
            ...otherFields
        })

        return res.status(201).json(section)
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = listSectionsSchema.parse(req.params)

        const sections = await SectionService.getByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(sections)
    }),

    update: catchAsync(async (req, res, next) => {
        const { section_id: sectionId, ...otherFields } = updateSectionSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedSection = await SectionService.update({
            user: req.user,
            sectionId,
            ...otherFields
        })

        return res.status(200).json(updatedSection)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { section_id: sectionId, force } = deleteSectionSchema.parse({
            ...req.params,
            ...req.query
        })

        await SectionService.delete({
            user: req.user,
            sectionId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { new_order: newOrder, section_id: sectionId } = moveSectionSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedSection = await SectionService.move({
            user: req.user,
            sectionId,
            newOrder
        })

        return res.status(200).json(movedSection)
    }),

}

module.exports = SectionController