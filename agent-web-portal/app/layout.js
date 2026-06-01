import './globals.css';

export const metadata = {
  title: 'Bluestar KitchenHub — Become an Agent',
  description: 'Join the Bluestar KitchenHub agent network. Handle restaurant reviews and customer feedback from home with our powerful desktop platform.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Bluestar KitchenHub',
    description: 'Join the Bluestar KitchenHub agent network.',
    images: [{ url: '/logo.png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}
