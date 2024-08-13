import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["100", "300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Pearl Harvest",
  description: "Your AI companion to get insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          lato.variable
        )}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex min-h-screen flex-col ">
            <div className="z-10 w-full sticky p-4 bg-slate-800  text-white lg:flex flex-row items-center">
              <Image
                src="/ReddBarna_Logo_Nor_Stacked.webp"
                alt="Redd Barna Logo"
                style={{ height: "auto", width: "50" }}
                width={75}
                height={77.497}
              />
              <div className="flex flex-col w-full">
                <span className="uppercase text-4xl mt-3 font-bold tracking-widest">
                  Pearl Harvest
                </span>
                <span className="text-sm tracking-widest mt-1">
                  Your AI companion for gathering insights
                </span>
              </div>
              <div className="justify-end">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Avatar>
                      <AvatarImage src="https://i.pravatar.cc/150?img=9" />
                      <AvatarFallback>VC</AvatarFallback>
                    </Avatar>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="flex justify-between space-x-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Jane Doe</h4>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
            <div className="p-2">{children}</div>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
