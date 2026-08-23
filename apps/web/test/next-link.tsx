import type { ComponentPropsWithoutRef } from "react";

type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
};

export default function Link({ children, href, ...props }: LinkProps) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
