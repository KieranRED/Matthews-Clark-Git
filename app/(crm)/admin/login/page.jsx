"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState("");

  const disabled = useMemo(() => !username.trim() || !password, [username, password]);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus("error");
        setError(json?.error || "Login failed");
        return;
      }
      setStatus("idle");
      router.replace("/admin");
    } catch (err) {
      setStatus("error");
      setError("Network error. Try again.");
    }
  }

  return (
    <main className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            M<span className={styles.acc}>/</span>C
          </div>
          <div className={styles.title}>CRM Login</div>
          <div className={styles.sub}>Internal use only.</div>
        </div>

        <label className={styles.label}>
          Username
          <input className={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>

        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>

        {error ? <div className={styles.error}>{error}</div> : null}

        <button className={styles.btn} disabled={disabled || status === "loading"} type="submit">
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

