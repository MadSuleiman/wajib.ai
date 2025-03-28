import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  return (
    <ScrollArea className="flex flex-col h-[100dvh] bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-4 flex flex-col h-full">
        <header className={`flex items-center justify-between mb-4 shrink-0`}>
          <div className="flex items-center gap-2">
            <Image
              className="dark:"
              src="/logos/logo-white.svg"
              alt="Wajib AI"
              width={30}
              height={30}
            />
            <h1 className="text-2xl font-bold text-center text-primary">
              Wajib AI
            </h1>
          </div>
        </header>
      </div>
    </ScrollArea>
  );
}
