import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "APDES | Organización y talento",
    template: "%s | APDES",
  },
  description:
    "Herramienta institucional para construir organigramas, revisar responsabilidades y acompañar el desarrollo del talento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
