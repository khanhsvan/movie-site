import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'StreamVault',
  description: 'Netflix mini streaming platform starter'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

