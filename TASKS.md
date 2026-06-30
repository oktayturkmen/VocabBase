# TASKS.md

# English Vocabulary App - Development Plan

> **Rule:** Complete only **ONE** task at a time. Stop after each task
> and wait for approval.

------------------------------------------------------------------------

## Phase 0 - Setup

### Task 0.1

-   Create Expo + TypeScript project
-   Configure ESLint
-   Configure Prettier
-   Configure path aliases
-   Verify app runs

### Task 0.2

Install: - Expo Router - NativeWind - Zustand - TanStack Query - React
Hook Form - Zod - SQLite - MMKV - Axios - FlashList - Expo Speech - Expo
Notifications

### Task 0.3

Create project folder structure according to `ARCHITECTURE.md`.

------------------------------------------------------------------------

## Phase 1 - Navigation

### Task 1.1

Create Expo Router tabs: - Home - Learn - Review - Statistics - Settings

### Task 1.2

Create global theme.

### Task 1.3

Create reusable UI components: - Button - Card - Input - Loading -
EmptyState - ProgressBar

------------------------------------------------------------------------

## Phase 2 - Database

### Task 2.1

Configure SQLite.

### Task 2.2

Create tables: - Words - Lists - WordLists - Reviews - Statistics

### Task 2.3

Seed 20 sample words.

------------------------------------------------------------------------

## Phase 3 - Word Management

### Task 3.1

Create Word Service (CRUD).

### Task 3.2

Create Zustand store.

### Task 3.3

Create Word List screen.

### Task 3.4

Create Add/Edit Word screen.

------------------------------------------------------------------------

## Phase 4 - Learning

### Task 4.1

Learning flow: Word → Meaning → Example → Next

### Task 4.2

Add pronunciation.

### Task 4.3

Add progress bar.

------------------------------------------------------------------------

## Phase 5 - Quiz

### Task 5.1

Multiple Choice Quiz.

### Task 5.2

Typing Quiz.

### Task 5.3

Result Screen.

------------------------------------------------------------------------

## Phase 6 - Review

### Task 6.1

Implement spaced repetition algorithm.

### Task 6.2

Today's review screen.

### Task 6.3

Update review after answer.

------------------------------------------------------------------------

## Phase 7 - Statistics

### Task 7.1

Daily statistics.

### Task 7.2

Weekly & Monthly charts.

------------------------------------------------------------------------

## Phase 8 - Notifications

### Task 8.1

Configure notifications.

### Task 8.2

Daily reminder.

------------------------------------------------------------------------

## Phase 9 - AI

### Task 9.1

Generate example sentence.

### Task 9.2

Cache AI responses.

------------------------------------------------------------------------

## Phase 10 - Import

### Task 10.1

CSV import.

### Task 10.2

PDF import.

------------------------------------------------------------------------

## Phase 11 - Lists

### Task 11.1

Create custom vocabulary lists.

### Task 11.2

Assign words to lists.

### Task 11.3

Learn by selected list.

------------------------------------------------------------------------

## Phase 12 - Settings

-   Theme
-   Speech speed
-   Daily goal
-   Reminder time

------------------------------------------------------------------------

## Phase 13 - Polish

-   Animations
-   Performance optimization
-   Error handling
-   Accessibility
-   Offline testing

------------------------------------------------------------------------

## Phase 14 - Release

-   ESLint
-   TypeScript check
-   Production build
-   Final testing

------------------------------------------------------------------------

# AI Agent Rules

1.  Read `ARCHITECTURE.md` before coding.
2.  Follow tasks in order.
3.  Complete one task only.
4.  Never skip tasks.
5.  Do not modify unrelated files.
6.  Keep business logic outside UI.
7.  Use strict TypeScript.
8.  Do not use `any`.
9.  Stop after each task.
10. Wait for user approval.

# Definition of Done

Every task must: - Build successfully - Have no TypeScript errors - Have
no ESLint errors - Follow architecture - Be reusable and maintainable
