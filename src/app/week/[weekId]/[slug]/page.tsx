import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPost, getContentImageUrl, getAllWeeks } from "@/lib/blog";

type Props = {
  params: Promise<{ weekId: string; slug: string }>;
};

export async function generateStaticParams() {
  const weeks = getAllWeeks();
  const params: { weekId: string; slug: string }[] = [];
  for (const week of weeks) {
    for (const post of week.posts) {
      params.push({ weekId: week.id, slug: post.slug });
    }
  }
  return params;
}

export default async function PostPage({ params }: Props) {
  const { weekId, slug } = await params;
  const post = getPost(weekId, slug);
  if (!post) notFound();

  const heroUrl = getContentImageUrl(post.weekId, post.heroImage);

  return (
    <div className="post-layout">
      <aside className="brand-panel">
        <Link href="/" className="brand-logo">
          CMSC 134 Blog
        </Link>
        <p className="brand-tagline">Project Blog</p>
        <Link href="/" className="cta-button">
          ← Back to Magazine
        </Link>
      </aside>

      <main className="post-main">
        <Link href="/" className="post-back">
          ← Magazine
        </Link>

        <div className="post-hero-wrap">
          <img src={heroUrl} alt="" />
        </div>

        <h1 className="post-title">{post.title}</h1>
        <h2 className="post-subtitle">{post.subtitle}</h2>
        <div className="post-meta">
          {post.author} · {new Date(post.date).toLocaleDateString("en-US", { dateStyle: "long" })}
        </div>

        <div className="post-body">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}
