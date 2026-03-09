# CMSC 134 Blog

A project blog that reads **Markdown files** from a **folder-per-writeup** structure and renders them in a fixed magazine layout (dark branding panel, main feature article, sidebar of related posts).

## How it works

- **One folder per writeup** under `content/`: `content/writeup1/`, `content/writeup2/`, etc.
- Each folder contains:
  - **`.md` files** – one per post, with required YAML frontmatter.
  - **Images** – hero and thumbnails referenced by filename in frontmatter.

The **fixed format** for every post is documented in **`CONTENT_FORMAT.md`**. Use `index.md` in a writeup folder as the lead/feature post. The homepage shows the latest writeup (highest number) first; older writeups appear under “Past issues.”

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The homepage shows the latest writeup’s lead post and sidebar; individual posts are at `/week/[writeupId]/[slug]` (e.g. `/week/writeup1/index`, `/week/writeup2/index`).

## Adding a new writeup

1. Create a folder: `content/writeup3/` (next number after your last writeup).
2. Add `index.md` (and optionally more `.md` files) with the frontmatter from `CONTENT_FORMAT.md`.
3. Add images (e.g. `hero.jpg`) in the same folder and set `heroImage: "hero.jpg"` in frontmatter.

No build step for content: restart or refresh so the app picks up new files.

## Tech

- **Next.js 14** (App Router)
- **gray-matter** for frontmatter, **react-markdown** for body
- Images in `content/` are served via `/api/content?week=...&file=...` (query param name is unchanged; value is e.g. `writeup1`)
