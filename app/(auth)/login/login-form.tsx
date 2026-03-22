"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const callbackUrl = searchParams.get("callbackUrl") ?? "/";

    try {
      const result = await signIn("nodemailer", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Something went wrong. Please try again.");
      } else {
        window.location.href = "/verify";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-neutral-50 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-xl bg-accent text-accent-fg py-3 text-sm font-semibold transition hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sending..." : "Send magic link"}
      </button>
    </form>
  );
}
