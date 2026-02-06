import {Request, Response, Router} from 'express'
import {prisma} from '../database'
import {authenticateToken} from '../middleware/auth.middleware'

export const decksRouter = Router()

decksRouter.use(authenticateToken)

decksRouter.post('/', async (req: Request, res: Response) => {
    try {
        const name = req.body.name
        const cards = req.body.cards
        const userId = req.user?.userId

        if (!userId) {
            return res.status(401).json({error: 'Token manquant'})
        }

        if (!name) {
            return res.status(400).json({error: 'Nom manquant'})
        }

        if (!Array.isArray(cards) || cards.some((id) => !Number.isInteger(id)) || cards.length !== 10) {
            return res.status(400).json({error: 'Le deck doit contenir exactement 10 cartes'})
        }

        const uniqueCards = new Set(cards)
        if (uniqueCards.size !== 10) {
            return res.status(400).json({error: 'Les cartes doivent être uniques'})
        }

        const existingCards = await prisma.card.findMany({
            where: {id: {in: cards}},
            select: {id: true}
        })

        if (existingCards.length !== 10) {
            return res.status(400).json({error: 'Certaines cartes sont invalides'})
        }

        const createdDeck = await prisma.deck.create({
            data: {
                name,
                userId,
                cards: {
                    create: cards.map((cardId) => ({cardId}))
                }
            },
            include: {
                cards: {
                    include: {card: true}
                }
            }
        })

        return res.status(201).json(createdDeck)
    } catch (error) {
        console.error('Erreur lors de la création du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

decksRouter.get('/mine', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            return res.status(401).json({error: 'Token manquant'})
        }

        const decks = await prisma.deck.findMany({
            where: {userId},
            include: {
                cards: {
                    include: {card: true}
                }
            },
            orderBy: {createdAt: 'desc'}
        })

        return res.status(200).json(decks)
    } catch (error) {
        console.error('Erreur lors de la récupération des decks:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

decksRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        const deckId = Number(req.params.id)

        if (!userId) {
            return res.status(401).json({error: 'Token manquant'})
        }

        if (!Number.isInteger(deckId)) {
            return res.status(404).json({error: 'Deck introuvable'})
        }

        const deck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId
            },
            include: {
                cards: {
                    include: {card: true}
                }
            }
        })

        if (!deck) {
            return res.status(404).json({error: 'Deck introuvable'})
        }

        return res.status(200).json(deck)
    } catch (error) {
        console.error('Erreur lors de la récupération du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

decksRouter.patch('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        const deckId = Number(req.params.id)
        const name = req.body.name
        const cards = req.body.cards

        if (!userId) {
            return res.status(401).json({error: 'Token manquant'})
        }

        if (!Number.isInteger(deckId)) {
            return res.status(404).json({error: 'Deck introuvable'})
        }

        const existingDeck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId
            },
            select: {id: true}
        })

        if (!existingDeck) {
            return res.status(404).json({error: 'Deck introuvable'})
        }

        if (!name && cards === undefined) {
            return res.status(400).json({error: 'Aucune donnée à modifier'})
        }

        let cardsUpdate = undefined

        if (cards !== undefined) {
            if (!Array.isArray(cards) || cards.some((id) => !Number.isInteger(id)) || cards.length !== 10) {
                return res.status(400).json({error: 'Le deck doit contenir exactement 10 cartes'})
            }

            const uniqueCards = new Set(cards)
            if (uniqueCards.size !== 10) {
                return res.status(400).json({error: 'Les cartes doivent être uniques'})
            }

            const existingCards = await prisma.card.findMany({
                where: {id: {in: cards}},
                select: {id: true}
            })

            if (existingCards.length !== 10) {
                return res.status(400).json({error: 'Certaines cartes sont invalides'})
            }

            cardsUpdate = {
                deleteMany: {},
                create: cards.map((cardId: number) => ({cardId}))
            }
        }

        const updatedDeck = await prisma.deck.update({
            where: {id: deckId},
            data: {
                ...(name ? {name} : {}),
                ...(cardsUpdate ? {cards: cardsUpdate} : {})
            },
            include: {
                cards: {
                    include: {card: true}
                }
            }
        })

        return res.status(200).json(updatedDeck)
    } catch (error) {
        console.error('Erreur lors de la modification du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

decksRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId
        const deckId = Number(req.params.id)

        if (!userId) {
            return res.status(401).json({error: 'Token manquant'})
        }

        if (!Number.isInteger(deckId)) {
            return res.status(404).json({error: 'Deck introuvable'})
        }

        const existingDeck = await prisma.deck.findFirst({
            where: {
                id: deckId,
                userId
            },
            select: {id: true}
        })

        if (!existingDeck) {
            return res.status(404).json({error: 'Deck introuvable'})
        }

        await prisma.deck.delete({
            where: {id: deckId}
        })

        return res.status(200).json({message: 'Deck supprimé'})
    } catch (error) {
        console.error('Erreur lors de la suppression du deck:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})