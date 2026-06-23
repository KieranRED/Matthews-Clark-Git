"use client";

import { useEffect, useState } from "react";

import { Icon } from "./icons";

// Converts a base64url-encoded VAPID public key to a Uint8Array for pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// State machine states: checking | unsupported | unsubscribed | requesting | subscribed | error
export default function PushSubscribeRow({ teamMemberId }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [status, setStatus] = useState("checking");
  const [errorMsg, setErrorMsg] = useState("");

  // Gate: only render inside an installed PWA (standalone mode).
  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  // On mount (after standalone check), determine initial subscription state.
  useEffect(() => {
    if (!isStandalone) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    // Check if already subscribed.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub && Notification.permission === "granted") {
          setStatus("subscribed");
        } else {
          setStatus("unsubscribed");
        }
      })
      .catch(() => setStatus("unsubscribed"));
  }, [isStandalone]);

  // Only render inside standalone PWA.
  if (!isStandalone) return null;

  async function handleSubscribe() {
    if (status === "subscribed" || status === "requesting") return;

    setStatus("requesting");

    try {
      // Step 1: Request notification permission. Must be inside a user gesture.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("[push-subscribe] Permission denied by user.");
        setErrorMsg("PERMISSION DENIED BY USER");
        setStatus("error");
        return;
      }

      // Step 2: Get the active SW registration.
      const reg = await navigator.serviceWorker.ready;

      // Step 3: Subscribe via pushManager.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      });

      // Step 4: POST subscription to the API.
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), teamMemberId })
      });
      if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);

      setStatus("subscribed");
    } catch (err) {
      const raw = err?.message || "SUBSCRIBE ERROR";
      setErrorMsg(raw.toUpperCase().slice(0, 48));
      setStatus("error");
    }
  }

  // Per-state visual config (UI-SPEC States table).
  const stateConfig = {
    checking: {
      iconBg: "rgba(255,255,255,.04)",
      border: null,
      name: "Notifications",
      meta: "CHECKING…",
      chevron: true,
      clickable: false
    },
    unsupported: {
      iconBg: "rgba(255,255,255,.04)",
      border: null,
      name: "Notifications",
      meta: "NOT SUPPORTED ON THIS DEVICE",
      chevron: false,
      clickable: false
    },
    unsubscribed: {
      iconBg: "rgba(255,255,255,.04)",
      border: null,
      name: "Enable notifications",
      meta: "TAP TO SUBSCRIBE · PWA ONLY",
      chevron: true,
      clickable: true
    },
    requesting: {
      iconBg: "rgba(31,79,255,.12)",
      border: null,
      name: "Subscribing…",
      meta: "REQUESTING PERMISSION",
      chevron: false,
      clickable: false
    },
    subscribed: {
      iconBg: "rgba(31,79,255,.12)",
      border: "3px solid #1F4FFF",
      name: "Notifications",
      meta: null, // rendered specially (dot + ACTIVE)
      chevron: true,
      clickable: false
    },
    error: {
      iconBg: "rgba(235,87,87,.12)",
      border: null,
      name: "Notifications",
      meta: errorMsg || "ERROR",
      chevron: true,
      clickable: true
    }
  };

  const cfg = stateConfig[status] || stateConfig.unsubscribed;
  const Tag = cfg.clickable ? "button" : "div";

  return (
    <Tag
      type={cfg.clickable ? "button" : undefined}
      className="set-row"
      onClick={cfg.clickable ? handleSubscribe : undefined}
      style={{
        textAlign: "left",
        width: "100%",
        borderLeft: cfg.border || undefined,
        cursor: cfg.clickable ? "pointer" : "default",
        opacity: status === "subscribed" ? 0.9 : 1
      }}
    >
      <div
        className="ic"
        style={{
          background: cfg.iconBg,
          color: status === "subscribed" || status === "requesting" ? "var(--mc-blue)" : undefined
        }}
      >
        <Icon.send />
      </div>
      <div className="lbl">
        <div className="name">{cfg.name}</div>
        <div className="meta">
          {status === "subscribed" ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#27AE60",
                  marginRight: 4,
                  verticalAlign: "middle"
                }}
              />
              ACTIVE
            </>
          ) : (
            cfg.meta
          )}
        </div>
      </div>
      {cfg.chevron ? <Icon.chev /> : null}
    </Tag>
  );
}
