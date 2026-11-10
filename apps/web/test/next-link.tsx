import { createContext, useContext, useMemo, useState, type ComponentPropsWithoutRef } from "react";

type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
};

const LinkStatusContext = createContext({ pending: false });

/** Like Vinext's: `pending` from the click until the navigation ends (here, until the link unmounts). */
export function useLinkStatus(): { pending: boolean } {
  return useContext(LinkStatusContext);
}

export default function Link({ children, href, onClick, ...props }: LinkProps) {
  const [pending, setPending] = useState(false);
  const status = useMemo(() => ({ pending }), [pending]);

  return (
    <LinkStatusContext value={status}>
      <a
        href={href}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setPending(true);
        }}
        {...props}
      >
        {children}
      </a>
    </LinkStatusContext>
  );
}
