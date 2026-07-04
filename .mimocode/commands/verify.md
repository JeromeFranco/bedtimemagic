---
description: "Run the full verification cycle: tests, typecheck, and lint. Pass a test path pattern as $ARGUMENTS to run specific tests."
---

Run all three verification steps in sequence. Report results from each. Stop on first failure.

```bash
npx jest --no-coverage ${ARGUMENTS:-2>&1}
```

```bash
npx tsc --noEmit 2>&1
```

```bash
npm run lint 2>&1
```

If any step fails, report which step failed and the key error. Do not proceed to the next step if the current one fails.
