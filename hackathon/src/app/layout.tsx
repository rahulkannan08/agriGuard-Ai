import React from 'react';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'AgriVision AI',
  description: 'AI-powered crop disease detection and treatment recommendation system',
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
