import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZCA Admin System",
  description: "He thong quan ly noi bo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.className} bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
