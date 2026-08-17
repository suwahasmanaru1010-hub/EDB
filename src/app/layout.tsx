import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "700"], // Light (300) and Bold (700)
});

export const metadata: Metadata = {
  title: "ISDOM - Entrepreneurs Database",
  description: "Sri Lankan Entrepreneurs Database System",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#0d0d0d",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ISDOM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} ${poppins.variable} bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
