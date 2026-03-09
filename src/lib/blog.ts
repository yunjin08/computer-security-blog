import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type PostMeta = {
  title: string;
  subtitle: string;
  date: string;
  author: string;
  excerpt: string;
  heroImage: string;
  thumbnail?: string;
};

export type Post = PostMeta & {
  slug: string;
  weekId: string;
  content: string;
};

export type Week = {
  id: string;
  path: string;
  posts: Post[];
  leadPost: Post | null;
};

/** Folder names like writeup1, writeup2; sorted by number descending (newest first). */
function getWriteupFolders(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const dirs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^writeup\d+$/.test(d.name))
    .map((d) => d.name);
  return dirs.sort((a, b) => {
    const nA = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nB = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return nB - nA;
  });
}

function getMdFilesInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".md"));
}

export function getAllWeeks(): Week[] {
  const folderNames = getWriteupFolders();
  return folderNames.map((weekId) => getWeek(weekId)).filter(Boolean) as Week[];
}

export function getWeek(weekId: string): Week | null {
  const weekPath = path.join(CONTENT_DIR, weekId);
  if (!fs.existsSync(weekPath)) return null;

  const mdFiles = getMdFilesInDir(weekPath);
  const posts: Post[] = [];

  for (const file of mdFiles) {
    const slug = file.replace(/\.md$/, "");
    const fullPath = path.join(weekPath, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data, content } = matter(raw) as unknown as { data: PostMeta; content: string };

    if (!data.title || !data.date) continue;

    posts.push({
      ...data,
      slug,
      weekId,
      content,
      thumbnail: data.thumbnail ?? data.heroImage,
    });
  }

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const leadPost =
    posts.find((p) => p.slug === "index") ?? posts[0] ?? null;
  const others = posts.filter((p) => p.slug !== "index");

  return {
    id: weekId,
    path: weekPath,
    leadPost,
    posts: leadPost ? [leadPost, ...others] : posts,
  };
}

export function getPost(weekId: string, slug: string): Post | null {
  const week = getWeek(weekId);
  if (!week) return null;
  return week.posts.find((p) => p.slug === slug) ?? null;
}

export function getContentImageUrl(weekId: string, filename: string): string {
  if (!filename) return "";
  // Path-based URL so each image has a unique cache key (avoids CDN serving same image for all /api/content requests)
  return `/api/content/${encodeURIComponent(weekId)}/${encodeURIComponent(filename)}`;
}
