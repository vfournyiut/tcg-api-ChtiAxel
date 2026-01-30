import {Request, Response, Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {prisma} from "../database";
import {env} from "../env";

export const authRouter = Router()

/**
 * POST /api/auth/sign-up
 * Créer un nouveau compte utilisateur
 */
authRouter.post('/sign-up', async (req: Request, res: Response) => {
    const {email, username, password} = req.body

    try {
        // 1. Valider les données
        if (!email || !username || !password) {
            return res.status(400).json({error: 'Données manquantes'})
        }

        // 2. Vérifier l'unicité de l'email
        const existingUser = await prisma.user.findUnique({
            where: {email},
        })

        if (existingUser) {
            return res.status(409).json({error: 'Email déjà utilisé'})
        }

        // 3. Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10)

        // 4. Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        })

        // 5. Générer le JWT (validité : 7 jours)
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            env.JWT_SECRET,
            {expiresIn: '7d'},
        )

        // 6. Retourner le token et les infos utilisateur (sans le mot de passe)
        return res.status(201).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

/**
 * POST /api/auth/sign-in
 * Se connecter avec un compte existant
 */
authRouter.post('/sign-in', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // 1. Valider les données
        if (!email || !password) {
            return res.status(400).json({error: 'Données manquantes'})
        }

        // 2. Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 3. Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 4. Générer le JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            env.JWT_SECRET,
            {expiresIn: '7d'},
        )

        // 5. Retourner le token et les infos utilisateur (sans le mot de passe)
        return res.status(200).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})