import { describe, expect, it } from "vitest";

import { initialsOf } from "./avatar";

describe("initialsOf", () => {
  it("uses only letters of the first two alphabetic words", () => {
    expect(initialsOf("Acme (Holdings)")).toBe("AH");
    expect(initialsOf("Fernando (partner)")).toBe("FP");
    expect(initialsOf("52 333 017 John Smith")).toBe("JS");
    expect(initialsOf("Maria de Souza Nogueira")).toBe("MS");
    expect(initialsOf("Ludwig van Beethoven")).toBe("LB");
    expect(initialsOf("Ágata Évora Lima")).toBe("ÁÉ");
  });

  it("takes two letters of a single word and ignores what has no letter", () => {
    expect(initialsOf("Acme")).toBe("AC");
    expect(initialsOf("(Acme) 2024")).toBe("AC");
    expect(initialsOf("  ")).toBe("");
    expect(initialsOf("123 — 456")).toBe("");
  });
});
