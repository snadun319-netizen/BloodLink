# Contributing to BloodLink

## Branching Strategy
- `main` — stable, review-approved code only
- `develop` — shared integration branch
- `feature/<module-name>` — e.g. `feature/donor-matching`, `feature/emergency-request`

## Workflow
1. Branch off `develop`: `git checkout -b feature/your-feature develop`
2. Commit with clear messages: "Implement radius-based donor query"
3. Push and open a Pull Request into `develop`
4. At least one other team member reviews before merging
5. Automated checks (lint, type-check, tests) must pass

## Rules
- Never commit `.env` files, API keys, or real verification documents
- Each member uses their own identifiable GitHub account
- Reference the related GitHub Issue in every PR
