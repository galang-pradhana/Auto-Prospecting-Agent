import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Premium Business Preview",
    description: "Automated Prospecting Engine Preview",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
