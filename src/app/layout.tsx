import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edge Secure API",
  description: "Production-grade Edge API built with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
