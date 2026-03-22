"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center gap-4">
      <p className="text-2xl">⚠️</p>
      <p className="text-neutral-200 font-medium">Something went wrong</p>
      <p className="text-neutral-500 text-sm">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 text-sm active:opacity-70"
      >
        Try again
      </button>
    </div>
  );
}
