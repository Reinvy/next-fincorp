import type { ReactNode } from "react";

/** Plain anchor for file downloads; Next Link would client-navigate to the API route. */
export function DownloadLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={className} download>
      {children}
    </a>
  );
}
