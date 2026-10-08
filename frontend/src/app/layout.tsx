import type { Metadata } from "next";
import { Inter, Schibsted_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "typeform — forms & surveys",
  description:
    "A functional clone of Typeform: build forms, share them, and collect responses through a one-question-at-a-time experience.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${grotesk.variable} font-body antialiased`}>
        {children}
        <Toaster
          position="bottom-left"
          toastOptions={{
            style: {
              borderRadius: "12px",
              border: "1px solid #e6e4df",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
