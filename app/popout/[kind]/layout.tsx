import type React from "react";

export default function PopoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="popout-surface">{children}</div>;
}
