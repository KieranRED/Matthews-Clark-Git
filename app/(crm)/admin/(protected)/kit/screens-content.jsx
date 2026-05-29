"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import styles from "./screens-content.module.css";

const SECTION_ORDER = ["failed", "scheduled", "processing", "published"];
const SECTION_LABEL = {
  failed: "FAILED",
  scheduled: "SCHEDULED",
  processing: "PROCESSING",
  published: "PUBLISHED"
};

function fmtScheduled(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time}`;
}

function QualityTag({ result }) {
  if (!result) return <span className={`${styles.qtag} ${styles.qtagChecking}`}>CHECKING…</span>;
  if (result.status === "optimised") return <span className={`${styles.qtag} ${styles.qtagOk}`}>OPTIMISED ✓</span>;
  return <span className={`${styles.qtag} ${styles.qtagWarn}`}>CHECK EXPORT ⚠</span>;
}

function PlatformBadges({ platforms }) {
  const ig = platforms?.includes("instagram");
  const tt = platforms?.includes("tiktok");
  return (
    <div className={styles.badges}>
      {ig ? <span className={`${styles.badge} ${styles.badgeIg}`}>IG</span> : null}
      {tt ? <span className={`${styles.badge} ${styles.badgeTt}`}>TT</span> : null}
    </div>
  );
}

function PostCard({ post, onRetry, retrying }) {
  const status = String(post.status || "pending");
  const variant =
    status === "failed" ? styles.cardFailed
      : status === "processing" ? styles.cardProcessing
      : status === "published" ? styles.cardPublished
      : "";
  return (
    <div className={`${styles.card} ${variant}`}>
      <div className={styles.cardTop}>
        <PlatformBadges platforms={post.platforms} />
        <span className={styles.scheduledAt}>{fmtScheduled(post.scheduledAt)}</span>
      </div>
      <div className={styles.cardMid}>
        <span className={styles.caption}>{post.caption || "(no caption)"}</span>
        <QualityTag result={post.qualityResult} />
      </div>
      {status === "failed" ? (
        <div className={styles.cardErr}>
          <span className={styles.errText}>{post.igError || "Unknown error"}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => onRetry(post)}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Retry Post"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function ContentScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/content?limit=200", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setPosts(Array.isArray(json.posts) ? json.posts : []);
    } catch (err) {
      setError(err?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(
    async (post) => {
      const id = post.id;
      setRetrying((m) => ({ ...m, [id]: true }));
      // Optimistic: move to scheduled locally
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "pending", igError: null } : p)));
      try {
        const res = await fetch(`/api/admin/content/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending", retryCount: (post.retryCount || 0) + 1 })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Retry failed");
        // Refresh from server to get authoritative state
        await load();
      } catch (err) {
        // Roll back: mark back as failed with new error text
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "failed", igError: "Retry failed. Try again." } : p))
        );
      } finally {
        setRetrying((m) => {
          const next = { ...m };
          delete next[id];
          return next;
        });
      }
    },
    [load]
  );

  const grouped = useMemo(() => {
    const buckets = { failed: [], scheduled: [], processing: [], published: [] };
    for (const p of posts) {
      const s = String(p.status || "").toLowerCase();
      if (s === "failed") buckets.failed.push(p);
      else if (s === "processing") buckets.processing.push(p);
      else if (s === "published") buckets.published.push(p);
      else buckets.scheduled.push(p); // pending → Scheduled section
    }
    return buckets;
  }, [posts]);

  const totalCount = posts.length;
  const subline = totalCount === 0
    ? "No posts yet."
    : `${grouped.scheduled.length} scheduled · ${grouped.published.length} published · ${grouped.failed.length} failed`;

  return (
    <main className={`screen ${styles.screen}`}>
      <header className="greeting">
        <span className="eyebrow">SOCIAL · QUEUE</span>
        <h1>
          <span className="acc">Content</span>.
        </h1>
        <div className="sub">{subline}</div>
      </header>

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : error ? (
        <div className={styles.empty}>Failed to load posts: {error}</div>
      ) : totalCount === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyHead}>No posts yet.</div>
          <div className={styles.emptyBody}>Tap + to create your first scheduled post.</div>
        </div>
      ) : (
        <div className={styles.sections}>
          {SECTION_ORDER.map((key) => {
            const list = grouped[key];
            if (!list || list.length === 0) return null;
            return (
              <section key={key} className={`${styles.section} ${styles[`section_${key}`]}`}>
                <div className={styles.sectionHd}>{SECTION_LABEL[key]}</div>
                <div className={styles.sectionList}>
                  {list.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      onRetry={handleRetry}
                      retrying={Boolean(retrying[p.id])}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={`fab ${styles.contentFab}`}
        onClick={() => router.push("/admin/content/new")}
        title="Create new post"
        aria-label="Create new post"
      >
        <Icon.plus />
      </button>
    </main>
  );
}
