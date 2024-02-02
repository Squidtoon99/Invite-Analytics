"use client";
import { ThemeProvider } from '@/components/theme-provider';
import '../styles/globals.css'
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
import { SWRConfig } from 'swr';
// export const metadata = {
//   title: 'Create Next App',
//   description: 'Generated by create next app',
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SWRConfig value={{
            provider: () => new Map(),
            fetcher: (url: string) => fetch(url).then(response => response.json()),
            onError: (err) => {
              console.error(err);
            }

          }}>
            {children}
          </SWRConfig>
        </ThemeProvider>
      </body>
    </html>
  )
}