# CLAUDE.md — How to work in this codebase

Operating principles for anyone (human or AI) writing code here. These are general
engineering discipline, adapted from Andrej Karpathy's practice (nanoGPT, micrograd,
llm.c, *"A Recipe for Training Neural Networks"*, and his talks on AI-assisted coding).
They are not decoration — follow them, whatever this project grows into.

---

## 1. Keep it on a tight leash

Make **small, incremental changes** and verify each one before the next. Never produce a
large diff that can't be reviewed line-by-line. After every meaningful change, the code
must still **run**. A broken-but-large change is worse than a small working one. When in
doubt, do less, confirm it works, continue.

> The most common failure mode is writing too much code before running it. Resist it.

This applies doubly to AI-generated code: don't accept a change you can't read and explain.
Generate in small, verifiable chunks and keep the program working at every step.

## 2. Become one with the data first

Before writing a parser, a schema, a model, or an algorithm — **look at the actual data**.
Open real samples. Find the messy cases (empty cells, weird encodings, quoted commas,
outliers, nulls). Most hard bugs live in the gap between the data you imagined and the data
you actually have. Understand it concretely before you design for it.

## 3. Build the end-to-end skeleton, then a dumb baseline

Get the **simplest possible thing working top-to-bottom first** — input to output, even if
every step is trivial — then add complexity one piece at a time, re-running after each.
A running ugly version beats a beautiful broken one. Resist the urge to build the whole
thing before you can execute any of it.

## 4. Distrust and verify — assume it's broken until proven otherwise

Code fails silently. A wrong line can sit in "working" code indefinitely. So:
- After a change, actually **exercise the path** — run it, click the button, read the output.
  Don't infer that it works because it compiled.
- Add asserts and validation **at boundaries** (parse, transform, persist, network). Surface
  bad input loudly; never silently drop or mangle it.
- **Unit-test the pure functions** — the core logic with no I/O. They're cheap to test and
  are usually where correctness actually matters.

## 5. Make state observable

Don't trust invisible state. When debugging, make it visible — log it, render it, inspect
it, count it. Build inspectability in: the user (and you) should always be able to *see*
what state the system is in. A clean reset to a known state is a debugging tool, not just
a feature.

## 6. Minimalism — less code, fewer dependencies

Prefer the smallest solution that works. Every dependency is a liability you carry
(security, build weight, breakage, churn). Don't add a library, an abstraction, or a
framework until the pain is real and present. Resist premature abstraction: write it
concretely twice before you generalize it once. nanoGPT is ~300 lines on purpose.

## 7. Reproducibility and a fast iteration loop

The thing you optimize hardest is the **feedback loop**. The edit→run→see-result cycle
should take seconds, not minutes — anything that slows it is worth fixing first. Make runs
**deterministic** (fixed seeds, known inputs, a reset to a clean state) so results are
comparable and bugs are reproducible.

## 8. Understand before you change

Don't refactor code you haven't read and understood. Don't move logic you can't restate in
plain language. Before changing a rule, be able to say what the rule *is* and confirm your
change preserves it. Understanding is the prerequisite to editing — not the byproduct of it.

---

*When these principles conflict, favor the one that keeps the code working and the loop
fast. A correct, simple, running system you understand beats an ambitious one you don't.*
