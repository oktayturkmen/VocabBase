# ARCHITECTURE.md

## Project Goal

Modern English Vocabulary App (Offline First)

## Tech Stack

-   React Native (Expo)
-   TypeScript
-   Expo Router
-   Zustand
-   TanStack Query
-   SQLite
-   MMKV
-   NativeWind
-   React Hook Form + Zod
-   Axios
-   Expo Speech
-   Expo Notifications

## Folder Structure

``` text
src/
  app/
  assets/
  components/
  constants/
  database/
  features/
  hooks/
  services/
  store/
  theme/
  types/
  utils/
```

## Rules

-   Feature-based architecture
-   Offline First
-   Business logic outside UI
-   SQLite for app data
-   MMKV for settings
-   Zustand for global state
-   TanStack Query for server state
-   No `any`
-   Reusable components
-   One responsibility per file

## Data Flow

Screen ↓ Hook ↓ Store ↓ Service ↓ SQLite/API ↓ Store Update ↓ UI

## Database Tables

-   Words
-   Lists
-   WordLists
-   Reviews
-   Statistics

## Future

-   AI example sentences
-   CSV/PDF import
-   Cloud sync
-   Authentication
