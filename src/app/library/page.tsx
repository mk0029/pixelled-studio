"use client";

import Link from "next/link";
import AnimationLibrary from "@/components/library/AnimationLibrary";

export default function LibraryPage() {
  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto mb-4 max-w-6xl">
        <Link href="/" className="text-sm text-teal-300 hover:underline">← Back to Studio</Link>
      </div>
      <AnimationLibrary />
    </main>
  );
}
