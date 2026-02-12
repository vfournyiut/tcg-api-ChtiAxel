import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prismaMock } from './vitest.setup';
import { app } from '../src/index';

describe('GET /api/cards', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('doit renvoyer la liste des cartes', async () => {
        prismaMock.card.findMany.mockResolvedValue([
            {
                id: 1,
                name: 'Pikachu',
                hp: 35,
                attack: 55,
                type: 'Electric',
                pokedexNumber: 25,
                imgUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);

        const response = await request(app).get('/api/cards');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty('name', 'Pikachu');
    });

    it('doit renvoyer 500 en cas d\'erreur', async () => {
        prismaMock.card.findMany.mockRejectedValue(new Error('db error'));

        const response = await request(app).get('/api/cards');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});
