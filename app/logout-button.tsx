"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

  return (
    <button
      className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
      onClick={async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }}
    >
      Logout
    </button>
  );
}
