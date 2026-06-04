import { getDuePostIds, getPost, updatePost } from "@/lib/contentStore";
import {
  acquireCronLock,
  createIgContainer,
  getIgAccessToken,
  pollIgContainer,
  publishIgContainer
} from "@/lib/igPublish";
import { telegramSendMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 60;

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Best-effort Telegram alert on failure transitions (SCHEDULE-05 / ROADMAP SC4).
 * Reuses the M&C bot env pattern from app/api/portal/leads/route.js.
 * Never throws — failed notifications are logged only.
 */
async function notifyFailure({ postId, post, reason }) {
  const chatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return;
  try {
    const platforms = Array.isArray(post?.platforms) ? post.platforms.join(", ") : "(unknown)";
    const scheduled = post?.scheduledAt || "(unknown)";
    await telegramSendMessage({
      chatId,
      token,
      text:
        `⚠️ <b>POST FAILED</b>\n` +
        `<b>ID:</b> <code>${escapeHtml(postId)}</code>\n` +
        `<b>Platforms:</b> ${escapeHtml(platforms)}\n` +
        `<b>Scheduled:</b> ${escapeHtml(scheduled)}\n` +
        `<b>Error:</b> ${escapeHtml(reason)}`
    });
  } catch (err) {
    console.error("[cron][post][telegram-failed]", postId, err);
  }
}

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

function isCronAuthorized(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = request.headers.get("authorization") || "";
  return got === `Bearer ${expected}`;
}

export async function GET(request) {
  if (!isCronAuthorized(request)) return unauthorized();

  const summary = {
    ok: true,
    startedAt: new Date().toISOString(),
    processed: 0,
    created: 0,
    published: 0,
    failed: 0,
    skipped: false,
    details: []
  };

  // Step 0: acquire distributed lock
  const locked = await acquireCronLock();
  if (!locked) {
    summary.skipped = true;
    summary.reason = "lock-held";
    return Response.json(summary);
  }

  try {
    const igUserId = process.env.IG_USER_ID;
    if (!igUserId) {
      summary.ok = false;
      summary.error = "IG_USER_ID env var not set";
      return Response.json(summary, { status: 500 });
    }
    const accessToken = await getIgAccessToken();
    if (!accessToken) {
      summary.ok = false;
      summary.error = "IG access token not available (seed IG_ACCESS_TOKEN env)";
      return Response.json(summary, { status: 500 });
    }

    // Step 1: find all posts whose scheduledAt has elapsed AND that are still pending or processing
    const dueIds = await getDuePostIds(Date.now());
    // Also process any "processing" posts even if not in content:schedule (defensive — usually they ARE removed when status flips)
    // Strategy: union (dueIds) with any processing posts found via listPosts({status:'processing'}) — but to avoid the extra read, trust dueIds.
    // The "processing" branch below also handles re-runs because we only zrem from content:schedule when status moves away from pending.

    for (const id of dueIds) {
      summary.processed += 1;
      const post = await getPost(id);
      if (!post) {
        summary.details.push({ id, action: "skip", reason: "not-found" });
        continue;
      }
      const status = String(post.status || "pending");
      try {
        if (status === "pending") {
          // Step A: create container
          if (post.igContainerId) {
            // Defensive: a previous run created the container but failed to update the record.
            // Skip create and fall through to poll.
          } else {
            const containerId = await createIgContainer({ post, accessToken, igUserId });
            await updatePost(id, { status: "processing", igContainerId: containerId, igError: null });
            summary.created += 1;
            summary.details.push({ id, action: "container-created", containerId });
            continue; // poll in NEXT cron run
          }
        }

        if (status === "processing" || post.igContainerId) {
          if (!post.igContainerId) {
            const reason = "Missing igContainerId on processing record";
            await updatePost(id, { status: "failed", igError: reason });
            await notifyFailure({ postId: id, post, reason });
            summary.failed += 1;
            summary.details.push({ id, action: "fail", reason: "no-container-id" });
            continue;
          }
          // Step B: poll
          const { statusCode, status: igStatus } = await pollIgContainer({ containerId: post.igContainerId, accessToken });
          if (statusCode === "FINISHED") {
            const igMediaId = await publishIgContainer({ containerId: post.igContainerId, accessToken, igUserId });
            await updatePost(id, { status: "published", igMediaId, igError: null });
            summary.published += 1;
            summary.details.push({ id, action: "published", igMediaId });
          } else if (statusCode === "ERROR" || statusCode === "EXPIRED") {
            const reason = `Container ${statusCode}: ${igStatus || statusCode}`;
            await updatePost(id, { status: "failed", igError: reason });
            await notifyFailure({ postId: id, post, reason });
            summary.failed += 1;
            summary.details.push({ id, action: "fail", reason: statusCode });
          } else if (statusCode === "PUBLISHED") {
            // Already published by a previous cron we lost track of.
            await updatePost(id, { status: "published", igError: null });
            summary.details.push({ id, action: "reconcile-published" });
          } else {
            // IN_PROGRESS or anything else — leave in processing, try again next run.
            summary.details.push({ id, action: "still-processing", statusCode });
          }
        }
      } catch (err) {
        const msg = err?.message || String(err);
        console.error("[cron][post][post-error]", id, msg);
        try {
          await updatePost(id, { status: "failed", igError: msg });
        } catch (writeErr) {
          console.error("[cron][post][update-failed]", id, writeErr);
        }
        await notifyFailure({ postId: id, post, reason: msg });
        summary.failed += 1;
        summary.details.push({ id, action: "fail", reason: msg });
      }
    }

    return Response.json(summary);
  } catch (err) {
    console.error("[cron][post][fatal]", err);
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
