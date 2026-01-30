import {Request, Response, Router} from 'express'
import {prisma} from "../database";

export const cardsRouter = Router()

cardsRouter.get('/', async (_req: Request, res: Response) => {
    try {
        const listcards = await prisma.card.findMany({
            orderBy: {
                pokedexNumber: 'asc'
            }
        })

        return res.status(200).json(listcards)
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})