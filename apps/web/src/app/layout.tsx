import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#C8102E",
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "LudiGest — Ludothèque BRED",
  description: "Gérez les emprunts de la ludothèque BRED",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LudiGest",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${bricolage.variable} font-body`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
