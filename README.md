# Kanban Board

A Next.js 14 Kanban board with drag-and-drop task management.

## Features

- Three columns: **To Do**, **In Progress**, **Done**
- Add task card with title, description, priority, assignee, and color tag
- Drag and drop cards between columns with `@dnd-kit/core`
- Task card UI with priority badge and assignee initials avatar
- Click card to open modal with full details, edit, and delete actions
- Column task count badges
- Task persistence in `localStorage`
- Responsive, clean white card UI

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build & Lint

```bash
npm run lint
npm run build
```

## Deploy

This app is fully deployable on Vercel with no external database.
