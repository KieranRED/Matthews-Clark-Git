"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

import styles from "./screens-content-new.module.css";

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return "";
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = n / 1024;
  return `${kb.toFixed(0)} KB`;
}

function nowLocalDatetimeValue() {
  // Returns "YYYY-MM-DDTHH:MM" in local time, +1 hour from now as a sane default.
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ContentNewScreen({ onSaved }) {
  const videoInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Video upload state
  const [videoFile, setVideoFile] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null); // { url, pathname, size }
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoErr, setVideoErr] = useState(null);

  // Quality check state — null=not yet, "checking"=in flight, object=result, "failed"=request failed
  const [quality, setQuality] = useState(null);

  // PDF upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  // Form fields
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState(nowLocalDatetimeValue());

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  const runQualityCheck = useCallback(async (blobUrl) => {
    setQuality("checking");
    try {
      const res = await fetch("/api/admin/content/quality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blobUrl })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setQuality({ status: json.status, checks: json.checks });
    } catch (err) {
      console.error("[content-new][quality]", err);
      setQuality("failed");
    }
  }, []);

  const handleVideoFile = useCallback(
    async (file) => {
      if (!file) return;
      setVideoErr(null);
      setQuality(null);
      setVideoFile(file);
      setVideoBlob(null);
      setVideoProgress(0);
      setVideoUploading(true);
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `social-videos/${Date.now()}-${safeName}`;
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/admin/content/upload-token",
          onUploadProgress: (event) => {
            if (event?.percentage != null) setVideoProgress(Math.round(event.percentage));
          }
        });
        setVideoBlob({ url: blob.url, pathname: blob.pathname, size: file.size });
        setVideoProgress(100);
        // Fire-and-forget quality check
        runQualityCheck(blob.url);
      } catch (err) {
        console.error("[content-new][upload-video]", err);
        setVideoErr(err?.message || "Video upload failed");
      } finally {
        setVideoUploading(false);
      }
    },
    [runQualityCheck]
  );

  const handlePdfFile = useCallback(async (file) => {
    if (!file) return;
    setPdfFile(file);
    setPdfBlob(null);
    setPdfUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `social-scripts/${Date.now()}-${safeName}`;
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/admin/content/upload-token"
      });
      setPdfBlob({ url: blob.url, pathname: blob.pathname });
    } catch (err) {
      console.error("[content-new][upload-pdf]", err);
    } finally {
      setPdfUploading(false);
    }
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith("video/")) handleVideoFile(f);
    },
    [handleVideoFile]
  );

  const canSubmit = useMemo(() => {
    return Boolean(videoBlob?.url) && Boolean(scheduledAt) && !submitting;
  }, [videoBlob, scheduledAt, submitting]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setSubmitErr(null);
      try {
        const qualityResult = quality && typeof quality === "object" ? quality : null;
        const scheduledAtIso = new Date(scheduledAt).toISOString();
        const body = {
          scheduledAt: scheduledAtIso,
          platforms: ["instagram"], // TikTok disabled in Phase 1 per CONTEXT.md
          caption,
          hashtags,
          videoUrl: videoBlob.url,
          videoBlobPath: videoBlob.pathname || null,
          scriptPdfUrl: pdfBlob?.url || null,
          qualityResult
        };
        const res = await fetch("/api/admin/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (typeof onSaved === "function") onSaved(json.post);
      } catch (err) {
        console.error("[content-new][submit]", err);
        setSubmitErr("Failed to save post. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, quality, scheduledAt, caption, hashtags, videoBlob, pdfBlob, onSaved]
  );

  // Quality tag rendering
  let qualityTag = null;
  if (videoBlob) {
    if (quality === "checking" || quality === null) {
      qualityTag = <span className={`${styles.qtag} ${styles.qtagChecking}`}>Checking…</span>;
    } else if (quality === "failed") {
      qualityTag = <span className={`${styles.qtag} ${styles.qtagWarn}`}>Check export ⚠</span>;
    } else if (quality.status === "optimised") {
      qualityTag = <span className={`${styles.qtag} ${styles.qtagOk}`}>Optimised ✓</span>;
    } else {
      const failed = Object.entries(quality.checks || {})
        .filter(([, v]) => !v)
        .map(([k]) => k);
      qualityTag = (
        <span className={`${styles.qtag} ${styles.qtagWarn}`} title={failed.join(" · ")}>
          Check export ⚠
        </span>
      );
    }
  }

  return (
    <main className={`screen ${styles.screen}`}>
      <header className="greeting">
        <span className="eyebrow">SOCIAL · NEW POST</span>
        <h1>
          New <span className="acc">post</span>.
        </h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Video dropzone */}
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneOver : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => videoInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime"
            style={{ display: "none" }}
            onChange={(e) => handleVideoFile(e.target.files?.[0])}
          />
          {videoUploading ? (
            <div className={styles.dropzoneState}>
              <div className={styles.dropzoneMsg}>Uploading… {videoProgress}%</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${videoProgress}%` }} />
              </div>
            </div>
          ) : videoBlob ? (
            <div className={styles.dropzoneState}>
              <div className={styles.dropzoneFile}>
                <span className={styles.filename}>{videoFile?.name || "video.mp4"}</span>
                <span className={styles.filesize}>{fmtBytes(videoFile?.size || videoBlob.size)}</span>
              </div>
              {qualityTag}
            </div>
          ) : (
            <div className={styles.dropzoneIdle}>Drop video here or tap to pick</div>
          )}
          {videoErr ? <div className={styles.fieldErr}>{videoErr}</div> : null}
        </div>

        {/* Caption */}
        <label className={styles.field}>
          <span className={styles.label}>CAPTION</span>
          <textarea
            className={styles.textarea}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            maxLength={2200}
          />
        </label>

        {/* Hashtags */}
        <label className={styles.field}>
          <span className={styles.label}>HASHTAGS</span>
          <input
            className={styles.input}
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#detailing #capetown"
            maxLength={2200}
          />
        </label>

        {/* Schedule */}
        <label className={styles.field}>
          <span className={styles.label}>SCHEDULE FOR</span>
          <input
            className={styles.input}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </label>

        {/* Platform toggles */}
        <div className={styles.field}>
          <span className={styles.label}>PLATFORMS</span>
          <div className={styles.toggleRow}>
            <button type="button" className={`${styles.toggle} ${styles.toggleActive}`} aria-pressed="true">
              Instagram
            </button>
            <button
              type="button"
              className={`${styles.toggle} ${styles.toggleDisabled}`}
              disabled
              title="TikTok posting coming soon"
              aria-disabled="true"
            >
              TikTok
            </button>
          </div>
        </div>

        {/* PDF script */}
        <label className={styles.field}>
          <span className={styles.label}>SCRIPT (PDF, OPTIONAL)</span>
          <div
            className={styles.pdfPicker}
            onClick={() => pdfInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => handlePdfFile(e.target.files?.[0])}
            />
            {pdfUploading
              ? <span className={styles.pdfLabel}>Uploading PDF…</span>
              : pdfBlob
                ? <span className={styles.pdfLabel}>{pdfFile?.name || "script.pdf"} ✓</span>
                : <span className={styles.pdfLabel}>Pick a PDF script</span>}
          </div>
        </label>

        {submitErr ? <div className={styles.submitErr}>{submitErr}</div> : null}

        <button
          type="submit"
          className={`${styles.cta} ${!canSubmit ? styles.ctaDisabled : ""}`}
          disabled={!canSubmit}
        >
          {submitting ? "Scheduling…" : "Schedule Post →"}
        </button>
      </form>
    </main>
  );
}
