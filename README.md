# Project Documentation: Randomizer Spaces

## 1. Overview

Randomizer Spaces is a full-stack web application designed to help users organize their decision-making process. It allows users to create **Spaces** (logical groups), **Collections** (categories within spaces), and **Items** (options within collections). The core feature is a random picker that selects an item from a collection with a visual animation.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (TypeScript) |
| Styling | Tailwind CSS 4.0 |
| Animations | Framer Motion (`motion/react`) |
| Icons | Lucide React |
| Backend/Database | Firebase (Firestore & Authentication) |
| Build Tool | Vite |

---

## 3. Data Architecture (Firestore)

The application uses a hierarchical data structure stored in a **flat collection pattern** for performance and ease of querying.

### Entities

#### 1. Space (`/spaces/{spaceId}`)
| Field | Type | Description |
|---|---|---|
| `title` | String | Name of the space, e.g., `"Wardrobe"` |
| `ownerId` | String | UID of the user who created it |
| `createdAt` | Timestamp | Creation timestamp |

#### 2. Collection (`/collections/{collectionId}`)
| Field | Type | Description |
|---|---|---|
| `title` | String | Category name, e.g., `"Shirts"` |
| `spaceId` | String | ID of the parent Space |
| `ownerId` | String | UID of the owner |
| `createdAt` | Timestamp | Creation timestamp |

#### 3. Item (`/items/{itemId}`)
| Field | Type | Description |
|---|---|---|
| `name` | String | The option name, e.g., `"Blue Denim"` |
| `collectionId` | String | ID of the parent Collection |
| `ownerId` | String | UID of the owner |
| `createdAt` | Timestamp | Creation timestamp |

---

## 4. Security & Access Control

Firestore Security Rules are implemented to ensure data privacy and integrity:

- **Ownership-Based Access:** Users can only read, create, update, or delete documents where the `ownerId` matches their authenticated `uid`.
- **Data Validation:**
  - Title/Name length constraints (< 100–200 chars).
  - Type checking for all fields.
  - Required field enforcement.
- **Default Deny:** All access is denied unless explicitly allowed by the ownership rules.

---

## 5. Key Application Logic

- **Authentication:** Uses Google OAuth via Firebase Auth (`signInWithPopup`).
- **Real-time Updates:** Uses `onSnapshot` listeners to keep the UI in sync with the database without manual refreshes.
- **Random Picker Logic:**
  - Filters items by `collectionId`.
  - Uses a `setInterval` to cycle through items for **1.5 seconds** to create a "rolling" visual effect.
  - Final selection is displayed in a prominent modal.
- **Cascading Deletes:** When a Space is deleted, the application logic iterates through associated Collections and Items to ensure no orphaned data remains *(handled client-side in this version)*.

---

## 6. Project Structure

| File/Path | Description |
|---|---|
| `/src/App.tsx` | Main application component containing the UI, state management, and business logic |
| `/src/firebase.ts` | Firebase initialization and service exports (`auth`, `db`) |
| `/firebase-applet-config.json` | Contains the Firebase project credentials |
| `/firebase-blueprint.json` | The IR (Intermediate Representation) of the database schema |
| `/firestore.rules` | The security rules deployed to the Firebase project |

---

## 7. Environment Variables

The project requires the following environment variables (defined in `.env.example`):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | For any future AI integrations |
| `APP_URL` | The base URL of the application |

---

## 8. Development & Deployment

```bash
# Start the local Vite dev server on port 3000
npm run dev

# Generate the production-ready dist folder
npm run build

# Check for TypeScript and syntax errors
npm run lint
```

---

## 9. Future Enhancement Ideas

- **AI Suggestions:** Integrate Gemini to suggest items based on the space's theme.
- **Shared Spaces:** Allow multiple users to collaborate on a single space.
- **Weighting:** Add the ability to give certain items a higher probability of being picked.
- **History:** Keep a log of recently picked items.
