import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockSense | Modular Inventory Management System",
  description:
    "Real-time location-aware inventory tracking system with stock ledger history, receipts, delivery orders, internal transfers, and stock adjustments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased light`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-950">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
