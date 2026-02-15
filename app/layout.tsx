import type { Metadata } from "next";
import { Chivo, IBM_Plex_Mono } from "next/font/google";
import "@/app/globals.css";

const chivo = Chivo({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oh-My-OpenCode Dashboard",
  description: "Agent usage dashboard for local OpenCode sessions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${chivo.variable} ${ibmPlexMono.variable} font-sans text-slate-300 antialiased`}
      >
        <div className="dashboard-grid-overlay" />
        <div className="dashboard-shell min-h-screen pb-8">
          <header className="sticky top-0 z-20 border-b border-cyan-100/10 bg-slate-950/55 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
              <h1 className="bg-gradient-to-r from-cyan-100 via-slate-100 to-amber-200 bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:text-2xl">
                Oh-My-OpenCode Agent Usage Dashboard
              </h1>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
