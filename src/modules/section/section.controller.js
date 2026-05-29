const SectionService = require('./section.service')
const catchAsync = require('../../shared/utils/catchAsync')

const SectionController = {

    create: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.params
        const { ...otherFields } = req.body

        const section = await SectionService.create({
            user: req.user,
            boardId,
            ...otherFields
        })

        return res.status(201).json(section)
    }),

    list: catchAsync(async (req, res, next) => {
        const { board_id: boardId } = req.params

        const sections = await SectionService.getByBoard({
            user: req.user,
            boardId
        })

        return res.status(200).json(sections)
    }),

    update: catchAsync(async (req, res, next) => {
        const { section_id: sectionId } = req.params
        const { ...otherFields } = req.body

        const updatedSection = await SectionService.update({
            user: req.user,
            sectionId,
            ...otherFields
        })

        return res.status(200).json(updatedSection)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { section_id: sectionId } = req.params
        const { force } = req.query

        await SectionService.delete({
            user: req.user,
            sectionId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { section_id: sectionId } = req.params
        const { new_order: newOrder } = req.body

        const movedSection = await SectionService.move({
            user: req.user,
            sectionId,
            newOrder
        })

        return res.status(200).json(movedSection)
    }),

}

module.exports = SectionController