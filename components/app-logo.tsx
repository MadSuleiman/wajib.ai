import Image from "next/image";
import Link from "next/link";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function AppLogo({ size = "md", showText = true }: AppLogoProps) {
  const sizes = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  const dimension = sizes[size];

  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/logos/logo.svg"
        alt="wajib"
        width={dimension}
        height={dimension}
        className="dark:hidden"
      />
      <Image
        src="/logos/logo-white.svg"
        alt="wajib"
        width={dimension}
        height={dimension}
        className="hidden dark:block"
      />
      {showText && <span className="font-semibold">wajib</span>}
    </Link>
  );
}
