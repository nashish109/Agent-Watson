# Contributing to Agent Watson

Thank you for considering contributing to Agent Watson. This document outlines the processes and standards for contributing.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](./CODE_OF_CONDUCT.md). Report unacceptable behavior to the maintainers.

## How to Contribute

### Reporting Bugs

- Check existing issues before filing a new one.
- Use the bug report template.
- Include steps to reproduce, expected behavior, and actual behavior.
- Include environment details (OS, Node version, pnpm version).

### Suggesting Features

- Check existing issues and discussions first.
- Describe the problem your feature solves, not just the solution.
- Explain how it aligns with the product vision.

### Pull Requests

1. Fork the repository.
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. Follow the coding standards and patterns established in the codebase.
4. Write tests for new functionality.
5. Ensure all checks pass:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
6. Keep PRs focused — one feature or fix per PR.
7. Update documentation if needed.

## Development Setup

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
pnpm install
pnpm dev
```

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `refactor:` code restructuring
- `test:` adding or updating tests
- `chore:` maintenance tasks

## Code Standards

- TypeScript strict mode enabled.
- Prettier for formatting (run `pnpm format` before committing).
- ESLint for linting (run `pnpm lint`).
- Write meaningful comments for non-obvious logic.
- Prefer pure functions and immutable patterns.

## Questions?

Open a [Discussion](https://github.com/ashish/agent-watson/discussions) or reach out to the maintainers.
