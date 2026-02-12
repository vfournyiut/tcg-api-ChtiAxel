import { Request, Response, Router } from 'express'
import { prisma } from "../database";

export const cardsRouter = Router()

/**
 * Retourne la liste des cartes triees par numero de Pokedex.
 *
 * @param {Request} _req Requete Express (non utilisee).
 * @param {Response} res Reponse Express contenant la liste des cartes.
 * @returns {Promise<Response>} Reponse HTTP 200 avec la liste, ou code d'erreur.
 * @throws {Error} Si une erreur interne survient lors de la lecture en base.
 */
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
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})