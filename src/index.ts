import 'dotenv/config'
import { createServer } from "http";
import { env } from "./env";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.routes";
import { cardsRouter } from './routes/cards.routes';
import { decksRouter } from './routes/decks.routes';
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "./database";

// Create Express app
export const app = express();

// Middlewares
app.use(
    cors({
        origin: true,  // Autorise toutes les origines
        credentials: true,
    }),
);

app.use(express.json());

// Serve static files (Socket.io test client)
app.use(express.static('public'));

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "TCG Backend Server is running" });
});

// routes
app.use("/api/auth", authRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/decks", decksRouter);

const swaggerDocument = (() => {
    const configPath = path.resolve(process.cwd(), "swagger.config.yml");
    const docsDir = path.resolve(process.cwd(), "docs");
    const docFiles = ["auth.doc.yml", "card.doc.yml", "deck.doc.yml"];

    const configDoc = yaml.load(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
    const mergedPaths: Record<string, unknown> = {};
    const mergedTags: Record<string, { name: string; description?: string }> = {};

    for (const fileName of docFiles) {
        const filePath = path.join(docsDir, fileName);
        const doc = yaml.load(fs.readFileSync(filePath, "utf8")) as {
            paths?: Record<string, unknown>;
            tags?: Array<{ name: string; description?: string }>;
        };

        if (doc.paths) {
            Object.assign(mergedPaths, doc.paths);
        }

        if (doc.tags) {
            for (const tag of doc.tags) {
                mergedTags[tag.name] = tag;
            }
        }
    }

    return {
        ...configDoc,
        paths: {
            ...(configDoc as { paths?: Record<string, unknown> }).paths,
            ...mergedPaths,
        },
        tags: Object.values(mergedTags),
    };
})();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

type JwtPayload = {
    userId: number;
    email: string;
}

type Room = {
    roomId: string;
    hostUserId: number;
    hostUsername: string;
    hostDeckId: number;
    hostSocketId: string;
    guestUserId?: number;
    guestUsername?: string;
    guestDeckId?: number;
    guestSocketId?: string;
    status: 'waiting' | 'playing';
}

type GameCard = {
    id: number;
    name: string;
    hp: number;
    attack: number;
    type: string;
    pokedexNumber: number;
    imgUrl: string | null;
}

type GameState = {
    roomId: string;
    currentTurn: number;
    players: {
        [userId: number]: {
            userId: number;
            username: string;
            deck: GameCard[];
            hand: GameCard[];
            activeCard: GameCard | null;
            hp: number;
        }
    }
}

// In-memory storage for rooms and games
const rooms: Map<string, Room> = new Map();
const games: Map<string, GameState> = new Map();

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
    // Create HTTP server
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token as string | undefined;

        if (!token) {
            next(new Error('Token manquant'));
            return;
        }

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

            socket.data.userId = decoded.userId;
            socket.data.email = decoded.email;

            next();
        } catch {
            next(new Error('Token invalide ou expiré'));
        }
    });

    io.on('connection', (socket) => {
        socket.emit('authenticated', {
            userId: socket.data.userId,
            email: socket.data.email,
        });

        // Helper function to broadcast available rooms
        const broadcastRoomsList = () => {
            const availableRooms = Array.from(rooms.values())
                .filter(room => room.status === 'waiting')
                .map(room => ({
                    roomId: room.roomId,
                    host: {
                        userId: room.hostUserId,
                        username: room.hostUsername,
                    }
                }));

            io.emit('roomsListUpdated', availableRooms);
        };

        // CREATE_ROOM handler
        socket.on('createRoom', async (data: { deckId: number }) => {
            try {
                const { deckId } = data;
                const userId = socket.data.userId;

                // Validate deck ownership and card count
                const deck = await prisma.deck.findFirst({
                    where: {
                        id: deckId,
                        userId: userId,
                    },
                    include: {
                        cards: {
                            include: {
                                card: true,
                            },
                        },
                        user: true,
                    },
                });

                if (!deck) {
                    socket.emit('error', { message: 'Le deck n\'appartient pas à l\'utilisateur' });
                    return;
                }

                if (deck.cards.length !== 10) {
                    socket.emit('error', { message: 'Le deck doit contenir exactement 10 cartes' });
                    return;
                }

                // Create room
                const roomId = uuidv4();
                const room: Room = {
                    roomId,
                    hostUserId: userId,
                    hostUsername: deck.user.username,
                    hostDeckId: deckId,
                    hostSocketId: socket.id,
                    status: 'waiting',
                };

                rooms.set(roomId, room);
                socket.join(roomId);

                socket.emit('roomCreated', {
                    roomId,
                    host: {
                        userId: room.hostUserId,
                        username: room.hostUsername,
                    },
                });

                broadcastRoomsList();
            } catch (error) {
                console.error('Error creating room:', error);
                socket.emit('error', { message: 'Erreur lors de la création de la room' });
            }
        });

        // GET_ROOMS handler
        socket.on('getRooms', () => {
            const availableRooms = Array.from(rooms.values())
                .filter(room => room.status === 'waiting')
                .map(room => ({
                    roomId: room.roomId,
                    host: {
                        userId: room.hostUserId,
                        username: room.hostUsername,
                    }
                }));

            socket.emit('roomsList', availableRooms);
        });

        // JOIN_ROOM handler
        socket.on('joinRoom', async (data: { roomId: string; deckId: number }) => {
            try {
                const { roomId, deckId } = data;
                const userId = socket.data.userId;

                const room = rooms.get(roomId);

                if (!room) {
                    socket.emit('error', { message: 'La room n\'existe pas' });
                    return;
                }

                if (room.status === 'playing') {
                    socket.emit('error', { message: 'La room est déjà complète' });
                    return;
                }

                // Validate deck ownership and card count
                const deck = await prisma.deck.findFirst({
                    where: {
                        id: deckId,
                        userId: userId,
                    },
                    include: {
                        cards: {
                            include: {
                                card: true,
                            },
                        },
                        user: true,
                    },
                });

                if (!deck) {
                    socket.emit('error', { message: 'Le deck n\'appartient pas à l\'utilisateur' });
                    return;
                }

                if (deck.cards.length !== 10) {
                    socket.emit('error', { message: 'Le deck doit contenir exactement 10 cartes' });
                    return;
                }

                // Update room with guest
                room.guestUserId = userId;
                room.guestUsername = deck.user.username;
                room.guestDeckId = deckId;
                room.guestSocketId = socket.id;
                room.status = 'playing';

                socket.join(roomId);

                // Fetch both decks with cards
                const hostDeck = await prisma.deck.findFirst({
                    where: { id: room.hostDeckId },
                    include: {
                        cards: {
                            include: { card: true },
                        },
                        user: true,
                    },
                });

                if (!hostDeck) {
                    socket.emit('error', { message: 'Erreur lors du chargement du deck du host' });
                    return;
                }

                // Initialize game state
                const shuffleArray = <T,>(array: T[]): T[] => {
                    const shuffled = [...array];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    return shuffled;
                };

                const hostCards = shuffleArray(hostDeck.cards.map(dc => dc.card));
                const guestCards = shuffleArray(deck.cards.map(dc => dc.card));

                const gameState: GameState = {
                    roomId,
                    currentTurn: room.hostUserId,
                    players: {
                        [room.hostUserId]: {
                            userId: room.hostUserId,
                            username: hostDeck.user.username,
                            deck: hostCards.slice(5),
                            hand: hostCards.slice(0, 5),
                            activeCard: null,
                            hp: 20,
                        },
                        [userId]: {
                            userId: userId,
                            username: deck.user.username,
                            deck: guestCards.slice(5),
                            hand: guestCards.slice(0, 5),
                            activeCard: null,
                            hp: 20,
                        },
                    },
                };

                games.set(roomId, gameState);

                // Send game state to host (with guest's hand hidden)
                io.to(room.hostSocketId).emit('gameStarted', {
                    roomId,
                    currentTurn: gameState.currentTurn,
                    you: gameState.players[room.hostUserId],
                    opponent: {
                        ...gameState.players[userId],
                        hand: gameState.players[userId].hand.map(() => null),
                        deck: gameState.players[userId].deck.map(() => null),
                    },
                });

                // Send game state to guest (with host's hand hidden)
                io.to(socket.id).emit('gameStarted', {
                    roomId,
                    currentTurn: gameState.currentTurn,
                    you: gameState.players[userId],
                    opponent: {
                        ...gameState.players[room.hostUserId],
                        hand: gameState.players[room.hostUserId].hand.map(() => null),
                        deck: gameState.players[room.hostUserId].deck.map(() => null),
                    },
                });

                broadcastRoomsList();
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Erreur lors de la jonction à la room' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            // Remove rooms where the disconnected player was the host
            for (const [roomId, room] of rooms.entries()) {
                if (room.hostSocketId === socket.id && room.status === 'waiting') {
                    rooms.delete(roomId);
                    broadcastRoomsList();
                }
            }
        });
    });


    // Start server
    try {
        httpServer.listen(env.PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
            console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
