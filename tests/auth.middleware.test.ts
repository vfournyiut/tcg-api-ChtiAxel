import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../src/middleware/auth.middleware';

describe('middleware authenticateToken', () => {
    const app = express();

    app.get('/protected', authenticateToken, (req, res) => {
        res.status(200).json({ user: req.user });
    });

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 401 si le token est manquant', async () => {
        const response = await request(app).get('/protected');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('doit renvoyer 401 si le token est invalide', async () => {
        const response = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer invalid.token');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token invalide ou expiré');
    });

    it('doit autoriser l\'accès si le token est valide', async () => {
        const token = jwt.sign(
            { userId: 42, email: 'user@example.com' },
            process.env.JWT_SECRET as string,
        );

        const response = await request(app)
            .get('/protected')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            user: {
                userId: 42,
                email: 'user@example.com',
            },
        });
    });
});
