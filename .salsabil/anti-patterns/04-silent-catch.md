# Anti-Pattern 04 — Silent Catch

## Symptom

```ts
try { await doThing(); } catch {}
try { await doThing(); } catch (e) { return null; }
```

## Why forbidden

- Hides invariant violations.
- Breaks tracing and audit.
- Article XII (Runtime Memory Persistence).

## Correct pattern

```ts
try { await doThing(); }
catch (err) {
  log.error({ msg: "doThing failed", err, trace_id });
  throw err; // or return a typed failure
}
```
