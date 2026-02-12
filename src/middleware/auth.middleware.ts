import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    // 1. Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        res.status(401).json({ error: 'Token manquant' })
        return
    }

    try {
        // 2. Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        // 3. Ajouter userId à la requête pour l'utiliser dans les routes
        req.user = {
            email: decoded.email,
            userId: decoded.userId
        }

        // 4. Passer au prochain middleware ou à la route
        return next()
    } catch (error) {
        res.status(401).json({ error: 'Token invalide ou expiré' })
        return
    }
}
