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
