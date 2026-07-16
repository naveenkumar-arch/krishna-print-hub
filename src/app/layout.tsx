import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Krishna Students Print Hub - Upload & Pay Online",
  description: "Fast & Reliable Printing. Upload & Pay Online, We Print Automatically! Located near SRM Valliammai College, Chengalpattu, Tamil Nadu.",
  metadataBase: new URL("https://nk-smart-print.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
