import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prismaMock } from './vitest.setup';
import { app } from '../src/index';

describe('POST /api/auth/sign-up', () => {
    const now = new Date();

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 400 si les données sont manquantes', async () => {
        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ email: 'ash@example.com' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Données manquantes');
    });

    it("doit renvoyer 409 si l'email existe déjà", async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: 1,
            username: 'ash',
            email: 'ash@example.com',
            password: 'hashed',
            createdAt: now,
            updatedAt: now,
        });

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ email: 'ash@example.com', username: 'ash', password: 'secret' });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Email déjà utilisé');
    });

    it('doit créer un utilisateur et renvoyer un token', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue({
            id: 10,
            username: 'misty',
            email: 'misty@example.com',
            password: 'hashed',
            createdAt: now,
            updatedAt: now,
        });

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ email: 'misty@example.com', username: 'misty', password: 'secret' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toEqual({
            id: 10,
            username: 'misty',
            email: 'misty@example.com',
        });
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({ email: 'gary@example.com', username: 'gary', password: 'secret' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('POST /api/auth/sign-in', () => {
    const now = new Date();

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 400 si les données sont manquantes', async () => {
        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'ash@example.com' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Données manquantes');
    });

    it('doit renvoyer 401 si l\'utilisateur est introuvable', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'ash@example.com', password: 'secret' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
    });

    it('doit renvoyer 401 si le mot de passe est invalide', async () => {
        const hashedPassword = await bcrypt.hash('secret', 10);

        prismaMock.user.findUnique.mockResolvedValue({
            id: 1,
            username: 'ash',
            email: 'ash@example.com',
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
        });

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'ash@example.com', password: 'wrong' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
    });

    it('doit renvoyer un token si les identifiants sont valides', async () => {
        const hashedPassword = await bcrypt.hash('secret', 10);

        prismaMock.user.findUnique.mockResolvedValue({
            id: 2,
            username: 'brock',
            email: 'brock@example.com',
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
        });

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'brock@example.com', password: 'secret' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toEqual({
            id: 2,
            username: 'brock',
            email: 'brock@example.com',
        });
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({ email: 'ash@example.com', password: 'secret' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});
