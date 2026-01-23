[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/B40PrDvw)
# Setup du projet

Ce projet est une API REST pour un jeu de cartes Pokemon en ligne avec système de jeu en temps réel. Il utilise *
*Express**, **TypeScript**, **Prisma ORM**, **PostgreSQL** et **Socket.io**.

Ce README vous guidera à travers le setup complet du projet et les différentes fonctionnalités à implémenter.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

### Node.js (v18 ou supérieur) et npm

Choisissez l'une des options suivantes :

**Option 1 : Installation directe de Node.js**

| Système | Lien |
|---------|------|
| Windows / macOS / Linux | [nodejs.org](https://nodejs.org/) |

**Option 2 : Via nvm (Node Version Manager) - Recommandé**

Permet de gérer plusieurs versions de Node.js facilement.

| Système | Lien |
|---------|------|
| macOS / Linux | [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) |
| Windows | [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) |

### Docker (pour la base de données PostgreSQL)

Choisissez l'une des options suivantes :

**Option 1 : Docker Desktop (Recommandé pour débuter)**

Interface graphique incluse, plus simple à utiliser.

| Système | Lien |
|---------|------|
| Windows | [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) |
| macOS | [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) |
| Linux | [Docker Desktop for Linux](https://docs.docker.com/desktop/setup/install/linux/) |

**Option 2 : Docker Engine (CLI uniquement)**

Version légère sans interface graphique.

| Système | Lien |
|---------|------|
| Linux | [Docker Engine](https://docs.docker.com/engine/install/) |
| Windows (WSL2) | [Docker Engine on WSL2](https://docs.docker.com/engine/install/ubuntu/) |

### Outils optionnels

- **Bruno** (client API REST) - Recommandé pour tester l'API : [usebruno.com](https://www.usebruno.com/downloads)
- **Éditeur de code** : [VS Code](https://code.visualstudio.com/) ou [WebStorm](https://www.jetbrains.com/webstorm/)

## Installation

### 1. Cloner le projet et installer les dépendances

```bash
npm install
```

### 2. Configuration de l'environnement

Créez un fichier `.env` à la racine du projet en copiant le fichier `.env.example` :

```bash
cp .env.example .env
```

Le fichier `.env` contient les variables suivantes :

```env
PORT=3001                              # Port du serveur Express
JWT_SECRET=your-super-secret-jwt-key   # Clé secrète pour les tokens JWT
NODE_ENV=development                   # Environnement (development/production)
DATABASE_URL=postgresql://tcg_user:tcg_password@localhost:5432/tcg_database
```

> **Note** :
> - La variable `DATABASE_URL` est générée automatiquement par Docker Compose. Vous n'avez pas besoin de la modifier.

### 3. Démarrer la base de données PostgreSQL

Le projet utilise Docker pour exécuter PostgreSQL en local :

```bash
npm run db:start
```

Cette commande démarre un conteneur Docker avec :

- **PostgreSQL 16 Alpine**
- Port : `5432`
- Database : `tcg_database`
- User : `tcg_user`
- Password : `tcg_password`

> **Commandes Docker utiles** :
> ```bash
> npm run db:stop    # Arrêter la base de données
> docker ps          # Vérifier que le conteneur tourne
> ```

### 4. Générer le client Prisma et créer la migration initiale

```bash
npm run db:generate    # Génère le client Prisma TypeScript
npm run db:migrate     # Crée et applique la migration initiale
```

### 5. Peupler la base de données avec les données de test

```bash
npm run db:seed
```

Cette commande crée :

- **2 utilisateurs de test** : `red` et `blue` (password: `password123`)
- **151 cartes Pokemon** avec leurs statistiques (HP, attack, type, etc.)

### 6. Démarrer le serveur de développement

```bash
npm run dev
```

Le serveur démarre sur **http://localhost:3001** avec hot-reload automatique.

Vous devriez voir :

```
🚀 Server is running on http://localhost:3001
🧪 Socket.io Test Client available at http://localhost:3001
```

## Structure du projet fourni

Voici l'architecture du code source déjà configurée :

```
but2-tcg-api/
├── src/
│   ├── index.ts              # Point d'entrée : serveur Express
│   ├── env.ts                # Configuration des variables d'environnement
│   ├── database.ts           # Instance du client Prisma
│   ├── types/                # Définitions TypeScript
│   │   └── express.d.ts      # Extension du type Request avec `user`
│   └── utils/                # Utilitaires (fourni)
│       └── rules.util.ts     # Calcul des dégâts avec faiblesses
├── prisma/
│   ├── schema.prisma         # Schéma de base de données Prisma
│   ├── seed.ts               # Script de seed (données initiales)
│   ├── migrations/           # Migrations SQL générées par Prisma
│   └── data/
│       └── pokemon.json      # Données des 151 Pokemon (Gen 1)
├── bruno/                    # Collection Bruno pour tester l'API REST
├── public/                   # Client HTML pour tester Socket.io
├── tests/                    # Tests unitaires (Vitest)
├── docker-compose.yml        # Configuration Docker pour PostgreSQL
└── .env.example              # Template des variables d'environnement
```

## Schéma de base de données initial

Le projet démarre avec un schéma Prisma simplifié contenant **2 modèles** :

```prisma
model Card {
  id            Int         @id @default(autoincrement())
  name          String
  hp            Int
  attack        Int
  type          PokemonType // Enum avec 18 types Pokemon
  pokedexNumber Int
  imgUrl        String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

> **Note** : Vous devrez enrichir ce schéma au cours du TP pour ajouter la gestion des decks et d'autres
> fonctionnalités.

## Outils disponibles

### 1. Prisma Studio (Interface graphique pour la BDD)

Visualisez et modifiez les données de votre base directement dans votre navigateur :

```bash
npm run db:studio
```

Ouvre **http://localhost:5555** avec une interface pour explorer les tables, modifier les données, etc.

### 2. Collection Bruno (Tests de l'API REST)

Le dossier `bruno/` contient une collection complète de requêtes HTTP pour tester votre API :

```
bruno/
├── Auth/           # Inscription, connexion
├── Cards/          # Récupération du catalogue
└── Decks/          # CRUD des decks (à implémenter)
```

**Utilisateurs de test disponibles** :

- Email : `red@example.com` / Password : `password123`
- Email : `blue@example.com` / Password : `password123`

> **Astuce** : Après connexion, récupérez le token JWT et utilisez-le dans l'onglet "Auth" de Bruno pour les requêtes
> protégées.

### 3. Client de test Socket.io (Interface WebSocket)

Un client HTML est fourni dans `public/` pour tester les WebSockets en temps réel.

Accédez-y via **http://localhost:3001** une fois le serveur démarré.

## Scripts npm disponibles

Voici tous les scripts définis dans `package.json` :

### Développement

```bash
npm run dev          # Démarre le serveur avec hot-reload (tsx watch)
npm run build        # Compile TypeScript vers JavaScript (dist/)
npm start            # Démarre le serveur en production (nécessite build)
```

### Base de données

```bash
npm run db:start     # Démarre PostgreSQL avec Docker
npm run db:stop      # Arrête le conteneur Docker
npm run db:generate  # Génère le client Prisma TypeScript
npm run db:migrate   # Crée et applique une migration
npm run db:seed      # Peuple la base avec les données de test
npm run db:reset     # Reset complet : migrations + seed
npm run db:studio    # Ouvre Prisma Studio (GUI)
```

### Tests

```bash
npm test             # Lance les tests en mode watch avec couverture
npm run test:ui      # Lance l'interface graphique des tests (Vitest UI)
```

### Vérification TypeScript

```bash
npm run ts:check     # Vérifie les erreurs TypeScript sans compiler
```

## Vérification du setup

Pour vérifier que tout fonctionne correctement :

1. **Serveur** : Visitez http://localhost:3001/api/health
    - Devrait retourner `{"status":"ok","message":"TCG Backend Server is running"}`

2. **Base de données** : Ouvrez Prisma Studio (`npm run db:studio`)
    - Vérifiez que les tables `Card` et `User` contiennent des données

# Comment réaliser ce TP

Ce TP est organisé en **11 tickets** correspondant aux différentes fonctionnalités à implémenter. Chaque ticket est
représenté par une **issue GitHub** dans votre projet.

## Workflow de travail

### 0. Créer les issues du TP (Étape initiale)

Avant de commencer à travailler sur les tickets, vous devez **générer les issues GitHub** correspondant aux différents
tickets du TP.

Pour cela, exécutez le workflow GitHub Actions "Seed TP issues" :

1. Allez sur l'onglet **Actions** de votre dépôt GitHub
2. Dans la liste des workflows à gauche, sélectionnez **"Seed TP issues"**
3. Cliquez sur le bouton **"Run workflow"** (en haut à droite)
4. Confirmez en cliquant à nouveau sur **"Run workflow"**

Le workflow va automatiquement :

- ✅ Fermer et verrouiller toutes les issues existantes
- ✅ Créer les **11 nouvelles issues** correspondant aux tickets du TP

> **Note** : Cette étape ne doit être effectuée qu'**une seule fois** au début du TP. Les issues créées contiendront
> toutes les informations nécessaires pour réaliser chaque ticket.

Une fois les issues créées, vous pouvez commencer à travailler sur les tickets.

Pour chaque ticket, suivez ces étapes :

### 1. Récupérer le ticket

Les tickets sont disponibles sous forme d'**issues GitHub** dans votre dépôt. Chaque issue contient :

- Une description détaillée de la fonctionnalité à implémenter
- Les exigences techniques à respecter
- Des exemples de code et de tests
- Une valeur en **points** correspondant à la notation

### 2. Créer une branche de travail

À partir de l'issue GitHub, créez une **branche dédiée** pour travailler sur le ticket :

```bash
# Exemple pour le ticket 1
git checkout -b 1-schema-prisma-deck-deckcard
```

> **Astuce** : GitHub propose un bouton "Create a branch" directement depuis l'issue pour automatiser cette étape.

### 3. Développer la fonctionnalité

Travaillez sur votre branche en suivant les exigences de l'issue :

- Implémentez le code demandé
- Testez votre implémentation
- Commitez régulièrement avec des messages clairs

```bash
git add .
git commit -m "feat: ajout des modèles Deck et DeckCard"
git push origin 1-schema-prisma-deck-deckcard
```

### 4. Créer une Pull Request (PR)

Une fois le ticket terminé, créez une **Pull Request** vers la branche `main` :

1. Allez sur GitHub et créez une PR depuis votre branche
2. **Liez la PR à l'issue** correspondante (utilisez "Closes #1" dans la description)
3. Remplissez la description de la PR avec :
    - Ce qui a été fait
    - Comment tester
    - Captures d'écran si pertinent

> ⚠️ **Important (GitHub Classroom)** : Lors de la création de la PR, GitHub peut proposer de cibler le **repository template** (celui d'origine) au lieu de **votre propre repository**. Assurez-vous que la PR cible bien **votre dépôt** (`votre-username/nom-du-repo`) et non le dépôt template. Si vous voyez une PR qui pointe vers un autre repository, changez le "base repository" pour sélectionner le vôtre.

### 5. Demander une review

Une fois la PR créée, **demandez au professeur de la reviewer** en assignant @vfourny comme reviewer.

Le professeur vérifiera :

- ✅ Le respect des exigences du ticket
- ✅ La qualité du code
- ✅ Le bon fonctionnement des tests
- ✅ La cohérence avec les bonnes pratiques

### 6. Merge et notation

Après validation du professeur :

- La PR sera **mergée** dans `main`
- L'issue sera automatiquement fermée
- Le ticket sera **noté** selon sa valeur en points

## Barème de notation

Chaque ticket a une valeur en points indiquée dans l'issue :

| Ticket    | Description                      | Points     |
|-----------|----------------------------------|------------|
| 1         | Schéma Prisma - Deck et DeckCard | 1 pts      |
| 2         | Script de seed                   | 1 pts      |
| 3         | Authentification et sécurisation | 2 pts      |
| 4         | API Cards                        | 1 pts      |
| 5         | API Decks - CRUD complet         | 3 pts      |
| 6         | Tests unitaires                  | 2,5 pts    |
| 7         | Documentation avec JSDoc         | 0,5 pts    |
| 8         | Documentation Swagger            | 1 pts      |
| 9         | Authentification Socket.io       | 1 pts      |
| 10        | Système de Matchmaking           | 3 pts      |
| 11        | Système de Jeu                   | 4 pts      |
| **Total** |                                  | **20 pts** |

## Conseils pratiques

- ✅ **Une branche = Un ticket** : Ne mélangez pas plusieurs tickets sur la même branche
- ✅ **Commits atomiques** : Faites des commits réguliers avec des messages clairs
- ✅ **Tests avant PR** : Assurez-vous que tout fonctionne avant de demander une review
- ✅ **Documentation** : Commentez votre code pour faciliter la review
