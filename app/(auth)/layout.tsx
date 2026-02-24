export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full overflow-hidden flex items-center justify-center bg-sett-background">
      {children}
    </div>
  );
}
