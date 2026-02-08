import Link from "next/link";
import { getAllWeeks, getContentImageUrl } from "@/lib/blog";

export default function Home() {
  const weeks = getAllWeeks();
  const latestWeek = weeks[0];
  const leadPost = latestWeek?.leadPost;
  const sidebarPosts = latestWeek
    ? latestWeek.posts.filter((p) => p.slug !== "index").slice(0, 4)
    : [];

  return (
    <div className="layout">
      <aside className="brand-panel">
        <Link href="/" className="brand-logo">
          CMSC 134 Blog
        </Link>
        <p className="brand-tagline">Project Blog</p>
      </aside>

      <main className="main-panel">
        <header className="top-bar">
          <Link href="/" className="nav-brand">
            CMSC 134 Blog
          </Link>
          <nav className="nav-links">
            <Link href="/">Magazine</Link>
            <span className="sep">|</span>
            <Link href="/#about">About</Link>
            <span className="sep">|</span>
            <Link href="/#authors">Authors</Link>
          </nav>
        </header>

        <div className="content-grid">
          <section className="feature-block">
            {leadPost && (
              <>
                <div className="feature-image-wrap">
                  <img
                    src={getContentImageUrl(leadPost.weekId, leadPost.heroImage)}
                    alt=""
                    className="feature-image"
                  />
                  <div className="feature-date-block">
                    <span className="feature-date">
                      {new Date(leadPost.date).toLocaleDateString("de-DE", {
                        month: "2-digit",
                        year: "numeric",
                      }).replace(".", "/")}
                    </span>
                    <span className="feature-mag">CMSC 134 Blog</span>
                  </div>
                </div>
                <h1 className="feature-title">{leadPost.title}</h1>
                <h2 className="feature-subtitle">{leadPost.subtitle}</h2>
                <p className="feature-excerpt">{leadPost.excerpt}</p>
                <article className="feature-card">
                  <div className="feature-card-thumb">
                    <img
                      src={getContentImageUrl(leadPost.weekId, leadPost.thumbnail ?? leadPost.heroImage)}
                      alt=""
                    />
                  </div>
                  <div className="feature-card-body">
                    <h3 className="feature-card-title">{leadPost.title}</h3>
                    <p className="feature-card-excerpt">{leadPost.excerpt}</p>
                    <div className="feature-card-meta">
                      <span>{leadPost.author}</span>
                      <span>{new Date(leadPost.date).toLocaleDateString("de-DE")}</span>
                      <span>0 Comments</span>
                    </div>
                    <Link
                      href={`/week/${leadPost.weekId}/${leadPost.slug}`}
                      className="read-more"
                    >
                      Read More
                    </Link>
                  </div>
                </article>
              </>
            )}
            {!leadPost && (
              <div className="no-posts">
                <p>No posts yet. Add <code>content/YYYY-wNN/index.md</code> and other .md files in that folder.</p>
                <p>See <code>CONTENT_FORMAT.md</code> for the fixed frontmatter format.</p>
              </div>
            )}
          </section>

          <aside className="sidebar">
            <h3 className="sidebar-title">More from this issue</h3>
            {sidebarPosts.map((post) => (
              <Link
                key={`${post.weekId}-${post.slug}`}
                href={`/week/${post.weekId}/${post.slug}`}
                className="sidebar-card"
              >
                <div className="sidebar-card-image">
                  <img
                    src={getContentImageUrl(post.weekId, post.thumbnail ?? post.heroImage)}
                    alt=""
                  />
                </div>
                <div className="sidebar-card-text">
                  <h4 className="sidebar-card-title">{post.title}</h4>
                  <p className="sidebar-card-excerpt">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </aside>
        </div>

        <section id="about" className="about-section">
          <h2 className="about-title">About</h2>
          <p className="about-text">
            This is a blog for CMSC 134 — Introduction to Security. We write about security in computers and argue from evidence and research.
          </p>
        </section>

        <section id="authors" className="authors-section">
          <h2 className="authors-title">Authors</h2>
          <p className="authors-list">
            Al Glenrey Tilacas<br />
            Princess Parages<br />
            Jed Edison Donaire
          </p>
        </section>
      </main>
    </div>
  );
}
