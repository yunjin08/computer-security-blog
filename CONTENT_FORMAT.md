# Blog content format (fixed format)

Each **week** is one folder under `content/`, named by year and week (e.g. `2022-w03`).

Inside that folder:

- **Markdown files** (`.md`) – one per post. Multiple posts per week are allowed.
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
- **heroImage** – Filename of the main article image in this week’s folder.
- **thumbnail** – Optional. Filename for small preview in sidebars; falls back to `heroImage` if omitted.

Images are always relative to the **same week folder** (e.g. `hero.jpg` = `content/2022-w03/hero.jpg`).

## Example folder

```
content/
  2022-w03/
    index.md          ← lead/feature post for the week
    hope-dies-last.md
    hero.jpg
    thumb-hope.jpg
```

Use `index.md` in a week folder as the **lead/feature** post for the magazine layout. Other `.md` files in that folder are shown in the sidebar/list.

---

## How many images to add (layout guide)

The layout uses images in these places:

| Where | What it shows | Uses frontmatter |
|-------|----------------|------------------|
| **Homepage — big hero** | Large image for the lead post | Lead post’s `heroImage` |
| **Homepage — feature card** | Small thumb next to “Read More” | Lead post’s `thumbnail` or `heroImage` |
| **Homepage — sidebar** | Small thumb for each “More from this issue” post | That post’s `thumbnail` or `heroImage` |
| **Post page** | Hero image at top of the article | That post’s `heroImage` |

### Minimum for one post (e.g. this week)

- **1 image** is enough.  
  Put one file in the week folder (e.g. `hero.jpg`) and set in frontmatter:
  - `heroImage: "hero.jpg"`
  - `thumbnail: "hero.jpg"` (or omit; it falls back to heroImage)

That one image is used for the big hero, the feature card thumb, and the post page hero.

**Example for `content/2022-w03/` (current week):**

```
content/2022-w03/
  index.md       ← your post (heroImage: "hero.jpg")
  hero.jpg       ← add this one image
```

### When you have multiple posts in one week

- **Option A — one shared image:** Use the same file (e.g. `hero.jpg`) in every post’s `heroImage` (and optional `thumbnail`). Still **1 image** for the whole week.
- **Option B — one image per post:** Give each post its own hero (e.g. `hero.jpg`, `post2.jpg`, `post3.jpg`). **Number of images = number of posts.** Use a different `thumbnail` only if you want a different picture in the sidebar cards.

### Suggested filenames

- One post: `hero.jpg` (or `hero.png`).
- Several posts: `hero.jpg` for the lead post, then e.g. `gen-alpha-hero.jpg`, `tiktok-algorithm.jpg` for others — any name; just match the filename in each post’s frontmatter.

### Summary

- **Right now (1 post):** add **1 image** — e.g. `content/2022-w03/hero.jpg` — and your layout is complete.
- **Later (more posts):** at least 1 image total (shared), or 1 per post for a distinct look.
