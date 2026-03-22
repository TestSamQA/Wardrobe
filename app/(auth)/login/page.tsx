import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Wardrobe</h1>
          <p className="mt-2 text-sm text-neutral-400">Your AI personal stylist</p>
        </div>
        {/* LoginForm uses useSearchParams — requires Suspense boundary */}
        <Suspense fallback={<div className="h-40" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-neutral-500">
          We&apos;ll email you a link to sign in — no password needed.
        </p>
      </div>
    </div>
  );
}
