export default function VerifyPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-neutral-900 p-5">
            <svg
              className="h-8 w-8 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
          We&apos;ve sent a magic link to your email address. Click the link to sign in.
        </p>
        <p className="mt-4 text-xs text-neutral-500">
          The link expires in 1 hour. If you don&apos;t see it, check your spam folder.
        </p>
        <a
          href="/login"
          className="mt-8 inline-block text-sm text-neutral-400 hover:text-neutral-200 transition underline underline-offset-4"
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
