import './globals.css';

export const metadata = {
  title: 'Project Z',
  description: 'AI-powered mathematics learning platform.',
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
