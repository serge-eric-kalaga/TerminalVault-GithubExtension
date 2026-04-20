import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { seedData } from '@/lib/data/seed';
import Boot from './boot';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'RecrutIA', description: 'AI-powered recruitment platform' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Boot seedData={seedData} />
              {children}
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
