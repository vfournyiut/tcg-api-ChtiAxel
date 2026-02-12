import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prismaMock } from './vitest.setup';
import { app } from '../src/index';

const buildAuthHeader = (payload?: { userId?: number; email?: string }): string => {
    const token = jwt.sign(
        {
            ...(payload?.userId !== undefined ? { userId: payload.userId } : {}),
            email: payload?.email ?? 'user@example.com',
        },
        process.env.JWT_SECRET as string,
    );

    return `Bearer ${token}`;
};

const now = new Date();
const validCards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const buildDeckResponse = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Starter',
    userId: 1,
    createdAt: now,
    updatedAt: now,
    cards: validCards.map((cardId, index) => ({
        id: index + 1,
        deckId: 1,
        cardId,
        card: {
            id: cardId,
            name: `Card ${cardId}`,
            hp: 10,
            attack: 5,
            type: 'Fire',
            pokedexNumber: cardId,
            imgUrl: null,
            createdAt: now,
            updatedAt: now,
            deckCards: [],
        },
    })),
    ...overrides,
});

describe('POST /api/decks', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 401 si le userId est absent du token', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ email: 'user@example.com' }))
            .send({ name: 'Starter', cards: validCards });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('doit renvoyer 400 si le nom est manquant', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ cards: validCards });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Nom manquant');
    });

    it("doit renvoyer 400 si la liste de cartes n'est pas un tableau", async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes');
    });

    it('doit renvoyer 400 si le nombre de cartes est invalide', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: validCards.slice(0, 9) });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes');
    });

    it('doit renvoyer 400 si la liste contient des valeurs non entieres', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10.5] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes');
    });

    it('doit renvoyer 400 si les cartes ne sont pas uniques', async () => {
        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Les cartes doivent être uniques');
    });

    it('doit renvoyer 400 si certaines cartes sont invalides', async () => {
        prismaMock.card.findMany.mockResolvedValue(validCards.slice(0, 9).map((id) => ({ id })) as never);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: validCards });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Certaines cartes sont invalides');
    });

    it('doit creer un deck', async () => {
        prismaMock.card.findMany.mockResolvedValue(validCards.map((id) => ({ id })) as never);
        prismaMock.deck.create.mockResolvedValue(buildDeckResponse() as never);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: validCards });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('name', 'Starter');
        expect(response.body.cards).toHaveLength(10);
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.card.findMany.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Starter', cards: validCards });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('GET /api/decks/mine', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 401 si le userId est absent du token', async () => {
        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', buildAuthHeader({ email: 'user@example.com' }));

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('doit renvoyer les decks utilisateur', async () => {
        prismaMock.deck.findMany.mockResolvedValue([buildDeckResponse()] as never);

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty('name', 'Starter');
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.deck.findMany.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('GET /api/decks/:id', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 401 si le userId est absent du token', async () => {
        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', buildAuthHeader({ email: 'user@example.com' }));

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('doit renvoyer 404 si l\'id du deck est invalide', async () => {
        const response = await request(app)
            .get('/api/decks/abc')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck introuvable');
    });

    it('doit renvoyer 404 si le deck est introuvable', async () => {
        prismaMock.deck.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck introuvable');
    });

    it('doit renvoyer un deck', async () => {
        prismaMock.deck.findFirst.mockResolvedValue(buildDeckResponse() as never);

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', 1);
        expect(response.body.cards).toHaveLength(10);
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.deck.findFirst.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('PATCH /api/decks/:id', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 401 si le userId est absent du token', async () => {
        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ email: 'user@example.com' }))
            .send({ name: 'Updated' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('doit renvoyer 404 si l\'id du deck est invalide', async () => {
        const response = await request(app)
            .patch('/api/decks/abc')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck introuvable');
    });

    it('doit renvoyer 404 si le deck est introuvable', async () => {
        prismaMock.deck.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Updated' });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck introuvable');
    });

    it('doit renvoyer 400 si aucune donnee n\'est fournie', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Aucune donnée à modifier');
    });

    it('doit renvoyer 400 si le nombre de cartes est invalide', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ cards: validCards.slice(0, 9) });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck doit contenir exactement 10 cartes');
    });

    it('doit renvoyer 400 si les cartes ne sont pas uniques', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ cards: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Les cartes doivent être uniques');
    });

    it('doit renvoyer 400 si certaines cartes sont invalides', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);
        prismaMock.card.findMany.mockResolvedValue(validCards.slice(0, 9).map((id) => ({ id })) as never);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ cards: validCards });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Certaines cartes sont invalides');
    });

    it('doit mettre a jour le nom du deck', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);
        prismaMock.deck.update.mockResolvedValue(buildDeckResponse({ name: 'Updated' }) as never);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Updated' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name', 'Updated');
    });

    it('doit mettre a jour les cartes du deck', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);
        prismaMock.card.findMany.mockResolvedValue(validCards.map((id) => ({ id })) as never);
        prismaMock.deck.update.mockResolvedValue(buildDeckResponse() as never);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ cards: validCards });

        expect(response.status).toBe(200);
        expect(response.body.cards).toHaveLength(10);
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);
        prismaMock.deck.update.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }))
            .send({ name: 'Updated' });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});

describe('DELETE /api/decks/:id', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer 401 si le userId est absent du token', async () => {
        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', buildAuthHeader({ email: 'user@example.com' }));

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Token manquant');
    });

    it('doit renvoyer 404 si l\'id du deck est invalide', async () => {
        const response = await request(app)
            .delete('/api/decks/abc')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck introuvable');
    });

    it('doit renvoyer 404 si le deck est introuvable', async () => {
        prismaMock.deck.findFirst.mockResolvedValue(null);

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck introuvable');
    });

    it('doit supprimer un deck', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);
        prismaMock.deck.delete.mockResolvedValue(buildDeckResponse() as never);

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Deck supprimé');
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.deck.findFirst.mockResolvedValue({ id: 1 } as never);
        prismaMock.deck.delete.mockRejectedValue(new Error('db error'));

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', buildAuthHeader({ userId: 1 }));

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});
