# Project Module Boundary

Project is a target-layer business module boundary introduced during Phase 4.

Target ownership:
- Project list and detail composition
- Project membership and staffing-facing orchestration
- Project summary and profitability-facing read models
- Project agent metadata and route-facing entrypoints

Current legacy implementation slices:
- `src/lib/server/modules/project`

Current target-layer structure:
- `app/`: workspace and navigation metadata
- `contracts/`: inbound, outbound, event, failure, and source contracts
- `workflows/`: reserved workflow entry grouping for project orchestration
- `capabilities/`: project action and future AI capability catalog
- `services/`: public API assembly and target-layer service surface
- `rules/`: future project rule ownership
- `policies/`: future policy ownership
- `schemas/`: future input and payload schema ownership
- `repositories/`: future repository seam ownership
- `adapters/`: explicit legacy bridge seams
- `events/`: module event contracts and handler registration
- `config/`: manifest and module configuration

Current bridge status:
- Public API assembly now lives under `src/modules/project/services`.
- Event handler registration now lives under `src/modules/project/events/handlers.ts`.
- Module manifest assembly now lives under `src/modules/project/config/manifest.ts`.
- Project action catalog now lives under
  `src/modules/project/capabilities/agent-actions.ts`.
- Root files such as `api.ts`, `contracts.ts`, `adapters.ts`, and `handlers.ts`
  are now thin compatibility shells over the deeper target-layer structure.
- The former compatibility entrypoints under
  `src/lib/server/modules/project/{api,index,handlers}.ts` have been retired
  after their caller count reached zero.
- Business logic and repository ownership still remain in the legacy slice for
  now; this phase moves the internal directory topology and public assembly
  boundary, not the underlying project business implementation.
- Legacy coupling inside this target module is intentionally isolated to
  `contracts/source.ts` and `adapters/legacy.ts`.
