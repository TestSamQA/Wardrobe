export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-neutral-950">
      {children}
    </div>
  );
}
