# Kanban Board

A Next.js Kanban board with drag-and-drop task management.

## Features

- Multiple boards with create, rename, and delete
- Three columns: **To Do**, **In Progress**, **Done**
- Add task card with title, description, priority, assignee, due date, and color tag
- Subtasks checklist on cards and detailed checklist editing in modal
- Due date support with red overdue badge
- Card comments section stored in localStorage
- Label/tag filter at the top by color tag
- Card view and compact list view toggle
- Drag and drop cards between columns with `@dnd-kit/core`
- Task and board persistence in `localStorage`
- Smooth transitions for drag feedback and column/card entry

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

This app is deployable on Vercel with no external database.
