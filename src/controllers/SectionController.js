const SectionService = require('../services/SectionService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { createSectionSchema, updateSectionSchema, moveSectionSchema } = require('../validators/sectionValidator')

const SectionController = {

    create: catchAsync(async (req, res, next) => {
        const result = createSectionSchema.safeParse({
            ...req.body,
            board_id: parseInt(req.params.boardId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { board_id, ...rest } = result.data

        const section = await SectionService.createSection({
            boardId: board_id,
            ...rest,
            userId: req.user.id
        })

        return res.status(201).json({
            message: 'Seção criada com sucesso!',
            section
        })

    }),

    list: catchAsync(async (req, res, next) => {
        const boardId = parseInt(req.params.boardId)
        if (!boardId || isNaN(boardId)) return next(new AppError('O parâmetro "boardId" é obrigatório e deve ser number', 400))

        const sections = await SectionService.getSectionsByBoard({
            boardId,
            userId: req.user.id
        })

        return res.status(200).json(sections)
    }),

    update: catchAsync(async (req, res, next) => {
        const result = updateSectionSchema.safeParse(req.body)
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const updatedSection = await SectionService.updateSection({
            sectionId: parseInt(req.params.sectionId),
            userId: req.user.id,
            ...result.data
        })

        return res.status(200).json({
            message: 'Seção atualizada com sucesso!',
            updatedSection
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const sectionId = parseInt(req.params.sectionId)
        if (!sectionId || isNaN(sectionId)) return next(new AppError('O parâmetro "sectionId" é obrigatório e deve ser number', 400))

        const result = await SectionService.deleteSection({
            sectionId,
            userId: req.user.id
        })

        return res.status(200).json({ message: 'Seção excuída com sucesso' })
    }),

    move: catchAsync(async (req, res, next) => {
        const result = moveSectionSchema.safeParse(req.body)
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { new_order } = result.data

        const updatedSection = await SectionService.moveSection({
            sectionId: parseInt(req.params.sectionId),
            userId: req.user.id,
            newOrder: new_order
        })

        return res.status(200).json(updatedSection)
    }),

}

module.exports = SectionController