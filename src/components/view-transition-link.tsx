"use client";

/**
 * ViewTransitionLink
 *
 * Drop-in replacement for next/link that wraps client-side navigation in
 * document.startViewTransition() when the browser supports it.
 *
 * No context provider needed — works standalone anywhere in the tree.
 * Falls back to normal next/link in unsupported browsers.
 */

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

type Props = React.ComponentProps<typeof NextLink>;

export function ViewTransitionLink({
  href,
  replace,
  scroll,
  onClick,
  children,
  ...props
}: Props) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e as React.MouseEvent<HTMLAnchorElement>);
      if (e.defaultPrevented) return;

      // Let the browser handle modified clicks / target="_blank" normally
      const target = e.currentTarget.getAttribute("target");
      if (target && target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Fall back to normal navigation if API unsupported
      if (!("startViewTransition" in document)) return;

      e.preventDefault();
      const navigate = replace ? router.replace : router.push;
      document.startViewTransition(() => {
        navigate(href as string, { scroll: scroll ?? true });
      });
    },
    [href, replace, scroll, onClick, router]
  );

  return (
    <NextLink href={href} {...props} onClick={handleClick}>
      {children}
    </NextLink>
  );
}
