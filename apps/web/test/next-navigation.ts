function unmocked(hook: string): never {
  throw new Error(`${hook} from next/navigation must be mocked by the test`);
}

export function usePathname(): never {
  return unmocked("usePathname");
}

export function useRouter(): never {
  return unmocked("useRouter");
}

export function useSearchParams(): never {
  return unmocked("useSearchParams");
}
