import { Navbar } from "@/components/Navbar";

export default function LoansLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </>
  );
}
