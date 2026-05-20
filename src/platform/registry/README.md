# Platform Registry Contracts

The registry is the platform mechanism that lets modules describe what they
provide without hard-coding product composition in the app shell.

Phase 3 moves the active runtime registry into this target directory while
`src/modules/legacy/server-modules/registry.ts` remains as a compatibility re-export.

The platform owns only the generic registry and registration helper. The active
application module list is composed by `src/app/bootstrap/register-modules.ts`.

The former `src/modules/legacy/server-modules/register-all.ts` compatibility side-effect
shim was retired in Phase 6 after its caller count reached zero.
