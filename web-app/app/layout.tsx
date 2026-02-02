import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Whisker & Paws Ad Engine',
  description: 'Generate marketing assets for your pet brand instantly',
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
