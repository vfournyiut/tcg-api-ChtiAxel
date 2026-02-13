import 'dotenv/config'
import { createServer } from "http";
import { env } from "./env";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { cardsRouter } from './routes/cards.routes';
import { decksRouter } from './routes/decks.routes';
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";

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

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
    // Create HTTP server
    const httpServer = createServer(app);


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
