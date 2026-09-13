import type { SVGProps } from "react";

export function OliveBranch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 160" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 155C32 124 47 94 70 44"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <g fill="currentColor">
        <path d="M68 49C66 27 76 11 87 2C87 22 81 39 68 49Z" />
        <path d="M56 76C58 52 72 41 90 34C84 52 72 68 56 76Z" />
        <path d="M49 91C37 73 40 53 46 39C54 57 56 75 49 91Z" />
        <path d="M39 112C49 91 70 85 88 85C74 100 57 110 39 112Z" />
        <path d="M31 129C19 112 20 94 24 79C32 93 38 114 31 129Z" />
        <path d="M23 147C33 132 48 126 66 125C55 139 37 147 23 147Z" />
      </g>
    </svg>
  );
}
