import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "700"], // Light (300) and Bold (700)
});

export const metadata: Metadata = {
  title: "EDB",
  description: "Sri Lankan Entrepreneurs Database",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
