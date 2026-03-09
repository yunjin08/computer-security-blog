# Blog content format (fixed format)

Each **writeup** is one folder under `content/`, named `writeup1`, `writeup2`, `writeup3`, etc. (no week or year).

Inside that folder:

- **Markdown files** (`.md`) – one per post. Multiple posts per writeup are allowed.
- **Images** – any files used in the posts (hero image, thumbnails, inline images). Reference them by filename in frontmatter.

## Markdown frontmatter (required)

Every post `.md` file must start with YAML frontmatter in this exact shape:

```yaml
---
title: "Main headline (e.g. ART & LIFE)"
subtitle: "Sub-headline (e.g. DON'T CLOSE YOUR EYES)"
date: "2022-01-19"
author: "Author Name"
excerpt: "Short summary for cards and previews."
heroImage: "hero.jpg"
thumbnail: "thumb.jpg"
---
```

- **title** – Main headline (large on the feature block).
- **subtitle** – Second line under the title.
- **date** – Publication date (YYYY-MM-DD).
- **author** – Author name.
- **excerpt** – Short summary for list/sidebar cards.
- **heroImage** – Filename of the main article image in this writeup’s folder.
- **thumbnail** – Optional. Filename for small preview in sidebars; falls back to `heroImage` if omitted.

Images are always relative to the **same writeup folder** (e.g. `hero.jpg` = `content/writeup1/hero.jpg`).

## Example folder

```
content/
  writeup1/
    index.md          ← lead/feature post for this writeup
    hero.jpg
  writeup2/
    index.md
    hero.png
```

Use `index.md` in a writeup folder as the **lead/feature** post for the magazine layout. Other `.md` files in that folder are shown in the sidebar/list. Writeups are ordered by number (writeup2 before writeup1 on the homepage = newest first).

---

## How many images to add (layout guide)

The layout uses images in these places:

| Where | What it shows | Uses frontmatter |
|-------|----------------|------------------|
| **Homepage — big hero** | Large image for the lead post | Lead post’s `heroImage` |
| **Homepage — feature card** | Small thumb next to “Read More” | Lead post’s `thumbnail` or `heroImage` |
| **Homepage — sidebar** | Small thumb for each “More from this issue” post | That post’s `thumbnail` or `heroImage` |
| **Homepage — Past issues** | Thumb for each past writeup | That post’s `thumbnail` or `heroImage` |
| **Post page** | Hero image at top of the article | That post’s `heroImage` |

### Minimum for one post (e.g. one writeup)

- **1 image** is enough.  
  Put one file in the writeup folder (e.g. `hero.jpg`) and set in frontmatter:
  - `heroImage: "hero.jpg"`
  - `thumbnail: "hero.jpg"` (or omit; it falls back to heroImage)

That one image is used for the big hero, the feature card thumb, and the post page hero.

**Example for `content/writeup1/`:**

```
content/writeup1/
  index.md       ← your post (heroImage: "hero.jpg")
  hero.jpg       ← add this one image
```

### When you have multiple posts in one writeup

- **Option A — one shared image:** Use the same file (e.g. `hero.jpg`) in every post’s `heroImage` (and optional `thumbnail`). Still **1 image** for the whole writeup.
- **Option B — one image per post:** Give each post its own hero (e.g. `hero.jpg`, `post2.jpg`). Use a different `thumbnail` only if you want a different picture in the sidebar cards.

### Suggested filenames

- One post: `hero.jpg` (or `hero.png`, `hero.webp`).
- Several posts: `hero.jpg` for the lead post, then e.g. `post2-hero.jpg` for others — any name; just match the filename in each post’s frontmatter.

### Summary

- **One writeup:** add **1 image** — e.g. `content/writeup1/hero.jpg` — and your layout is complete.
- **More writeups:** add a new folder `content/writeup3/`, etc., each with its own `index.md` and hero image.
