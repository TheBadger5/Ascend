"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const toFriendlySignupError = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (normalized.includes("password should be at least")) {
    return "Password is too short. Use at least 6 characters.";
  }
  if (normalized.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  return "Unable to create your account right now. Please try again.";
};

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 px-6 py-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)]">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-50">Sign Up</h1>
          <p className="mb-6 text-sm text-zinc-400">Create your Ascend account.</p>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError("");
              setSuccess("");

              const trimmedEmail = email.trim();
              const { error: signUpError } = await supabase.auth.signUp({
                email: trimmedEmail,
                password,
              });
              setIsSubmitting(false);

              if (signUpError) {
                setError(toFriendlySignupError(signUpError.message));
                return;
              }

              setSuccess("Account created. Check your email for a confirmation link, then log in.");
              setPassword("");
            }}
          >
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500"
              />
            </div>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full border border-zinc-500 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-all duration-200 hover:border-zinc-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-zinc-300 hover:text-zinc-100">
              Login
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
