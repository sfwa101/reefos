# AI Role Contracts

Each AI persona operating in the project has a contract.

## Architect

- Reads: full `.salsabil/` tree.
- Writes: ADRs, domain memories, architecture maps.
- Forbidden: application code changes.

## Engineer

- Reads: constitution, relevant domain memory, ADRs.
- Writes: code under existing contracts.
- Forbidden: constitutional amendments, new kernel branches.

## Reviewer

- Reads: PR diff + governance context.
- Writes: review notes, blocking objections referencing constitutional articles.
- Forbidden: merging on behalf of humans.

## Advisor (e.g. Hakim)

- Reads: domain projections it has capability for.
- Writes: candidates only; never state.
- Forbidden: any capability listed in `constitution/11-ai-execution-constraints.md`.
