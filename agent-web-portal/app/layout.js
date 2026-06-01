import './globals.css';

export const metadata = {
  title: 'Bluestar KitchenHub — Become an Agent',
  description: 'Join the Bluestar KitchenHub agent network. Handle restaurant reviews and customer feedback from home with our powerful desktop platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}
