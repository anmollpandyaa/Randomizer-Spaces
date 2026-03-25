
🎲 Randomizer Spaces

A full-stack web application designed to simplify decision-making by organizing your choices into structured groups and picking one at random—with style.

🧠 Overview

Randomizer Spaces helps users organize decisions into:

Spaces → Logical groups (e.g., Wardrobe)
Collections → Categories inside spaces (e.g., Shirts)
Items → Actual options (e.g., Blue Denim)

✨ The highlight feature is a random picker with animated selection, making decision-making fun and interactive.

🛠️ Tech Stack
Frontend: React 19 (TypeScript)
Styling: Tailwind CSS 4.0
Animations: Framer Motion
Icons: Lucide React
Backend & Database: Firebase (Firestore + Authentication)
Build Tool: Vite
🗂️ Data Architecture (Firestore)

The app uses a flat collection pattern for better performance and easy querying.

Entities
🏠 Space (/spaces/{spaceId})
title → Name of the space
ownerId → User UID
createdAt → Timestamp
📦 Collection (/collections/{collectionId})
title → Category name
spaceId → Parent Space ID
ownerId → User UID
createdAt → Timestamp
🧩 Item (/items/{itemId})
name → Option name
collectionId → Parent Collection ID
ownerId → User UID
createdAt → Timestamp
🔐 Security & Access Control

Firestore rules ensure strict data safety:

✅ Ownership-Based Access
Users can only access their own data (ownerId === auth.uid)
🧪 Data Validation
Field type enforcement
Required fields
Length constraints (100–200 chars)
🚫 Default Deny
All access is blocked unless explicitly allowed
⚙️ Key Features & Logic
🔑 Authentication
Google OAuth via Firebase (signInWithPopup)
🔄 Real-Time Sync
Uses onSnapshot listeners for live UI updates
🎯 Random Picker
Filters items by collectionId
Uses setInterval (~1.5s) to create a rolling animation
Final selection shown in a modal
🧹 Cascading Deletes
Deleting a Space removes:
Its Collections
Their Items
Handled client-side (prevents orphaned data)
📁 Project Structure
/src
  ├── App.tsx                # Main UI + business logic
  ├── firebase.ts           # Firebase config (auth + db)

/firebase-applet-config.json   # Firebase credentials
/firebase-blueprint.json       # DB schema representation
/firestore.rules               # Security rules
🔑 Environment Variables

Create a .env file based on .env.example:

GEMINI_API_KEY=your_api_key
APP_URL=http://localhost:3000
🚀 Development & Deployment
▶️ Run Locally
npm run dev

Starts Vite dev server on port 3000

🏗️ Build
npm run build

Generates production-ready dist/ folder

🧹 Lint
npm run lint

Checks for TypeScript & syntax issues

🔮 Future Enhancements
🤖 AI Suggestions
Recommend items based on space theme
👥 Shared Spaces
Collaborate with multiple users
⚖️ Weighted Randomization
Assign probability to items
📜 History Tracking
Track previously selected items
💡 Inspiration

Decision fatigue is real. This project turns decision-making into something fast, visual, and enjoyable.
