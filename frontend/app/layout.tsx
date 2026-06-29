import './globals.css';

export const metadata = {
  title: 'Project Z | Meletiou Mathematics',
  description: 'AI-powered mathematics learning platform for students, teachers, and parents.',
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
