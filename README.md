# workday

A lightweight, Monday.com-style work management app built with React and Vite. Organize work into boards, groups, and items; track it across table, kanban, and dashboard views; and wire up simple no-code automations — all running fully in the browser with local persistence (no backend required).

## Features

- **Boards, groups & items** — Organize work into multiple boards, each with color-coded groups of items. Star boards as favorites, rename/delete groups, and add items inline.
- **Three views** — Switch between a spreadsheet-style **Table**, a drag-and-drop **Kanban** board (grouped by status), and a **Dashboard** with charts.
- **Rich columns** — Built-in Owner (people), Status, Priority, Due date, and Notes columns, plus custom **Text**, **Number**, **Date**, **Checkbox**, and **Dropdown** columns you can add, rename, and delete per board.
- **No-code automations** — Create rules like *"When status changes to Done, move item to the Done group"* or *"When an item is created, assign a person."* Rules run instantly on table edits, kanban drags, and item creation.
- **Item updates** — Per-item activity panel for posting updates and keeping context in one place. Automations log their actions here too.
- **Live dashboard** — Status distribution, progress by group, open tasks per person, and totals for numeric columns, powered by Recharts.
- **Overdue tracking** — Due dates are highlighted when overdue (and not yet done).
- **Local persistence** — Data is saved automatically to your browser's `localStorage`, so your work survives refreshes. The app still runs (in-memory) if storage is unavailable.

## Tech stack

- [React 19](https://react.dev/)
- [Vite](https://vite.dev/) (dev server & build)
- [Tailwind CSS](https://tailwindcss.com/) (styling)
- [Recharts](https://recharts.org/) (dashboard charts)
- [lucide-react](https://lucide.dev/) (icons)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (Node 20+ recommended)
- npm (bundled with Node)

### Installation

1. Clone the repository and move into the project directory:

   ```bash
   git clone <repository-url>
   cd workday
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the URL printed in your terminal (typically [http://localhost:5173](http://localhost:5173)) in your browser.

The app ships with seed data (a Product Roadmap, Marketing Campaigns, and Hiring Pipeline board) so you can explore it immediately. Use the **Reset** option in the sidebar to restore the seed data at any time.

## Available scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot module reload.  |
| `npm run build`   | Build an optimized production bundle into `dist/`. |
| `npm run preview` | Preview the production build locally.              |
| `npm run lint`    | Run ESLint over the project.                       |

## Building for production

```bash
npm run build
npm run preview   # serve the built app locally to verify
```

The static output in `dist/` can be deployed to any static host (Netlify, Vercel, GitHub Pages, S3, etc.).

## Project structure

```
workday/
├── index.html            # App entry HTML
├── src/
│   ├── main.jsx          # React root
│   ├── App.jsx           # Entire app: views, cells, automation engine, storage
│   ├── index.css         # Tailwind entry + global styles
│   └── assets/           # Static images
├── public/               # Static files served as-is
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── eslint.config.js
```

## License

See [LICENSE](LICENSE).
