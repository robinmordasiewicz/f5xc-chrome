# Contributing Guide

Thank you for your interest in contributing to the F5 XC Console plugin! This guide covers how to set up your development environment and contribute quality code.

## Development Setup

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 9+
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/robinmordasiewicz/f5xc-console.git
cd f5xc-console

# Install dependencies
npm install

# Verify setup
npm run qa
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit source files in `src/` directory.

### 3. Write Tests

Add tests for your changes in `tests/unit/` or `tests/integration/`.

### 4. Run Tests

```bash
# Quick validation
npm run qa:unit

# Full validation
npm run qa
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

## Code Standards

### TypeScript

- Use strict TypeScript (`strict: true`)
- Export types from modules
- Use interfaces for public APIs

```typescript
// Good
export interface NavigationResult {
  success: boolean;
  url: string;
  error?: string;
}

export function navigate(target: string): NavigationResult {
  // ...
}
```

### Testing

- Every new function needs tests
- Aim for 80%+ coverage on new code
- Use descriptive test names

```typescript
describe('MyModule', () => {
  describe('myFunction()', () => {
    test('should return success for valid input', () => {
      // Arrange
      const input = 'valid';

      // Act
      const result = myFunction(input);

      // Assert
      expect(result.success).toBe(true);
    });

    test('should handle empty input gracefully', () => {
      const result = myFunction('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

## Adding New Modules

### 1. Create Source File

```typescript
// src/core/my-module.ts
export interface MyModuleOptions {
  timeout?: number;
}

export class MyModule {
  constructor(private options: MyModuleOptions = {}) {}

  public process(input: string): string {
    // Implementation
    return input.toUpperCase();
  }
}

// Singleton helpers
let instance: MyModule | null = null;

export function getMyModule(options?: MyModuleOptions): MyModule {
  if (!instance) {
    instance = new MyModule(options);
  }
  return instance;
}

export function resetMyModule(): void {
  instance = null;
}
```

### 2. Create Test File

```typescript
// tests/unit/core/my-module.test.ts
import { MyModule, getMyModule, resetMyModule } from '../../../src/core/my-module';

describe('MyModule', () => {
  let module: MyModule;

  beforeEach(() => {
    module = new MyModule();
  });

  describe('process()', () => {
    test('should uppercase input', () => {
      expect(module.process('hello')).toBe('HELLO');
    });

    test('should handle empty string', () => {
      expect(module.process('')).toBe('');
    });
  });

  describe('singleton', () => {
    afterEach(() => {
      resetMyModule();
    });

    test('getMyModule returns same instance', () => {
      const a = getMyModule();
      const b = getMyModule();
      expect(a).toBe(b);
    });
  });
});
```

### 3. Export from Index

```typescript
// src/core/index.ts
export * from './my-module';
```

## Test Helpers

### Snapshot Factory

Use the snapshot factory for creating test data:

```typescript
import {
  createTestSnapshot,
  createLoginPageSnapshot,
  createAuthenticatedHomeSnapshot,
  SnapshotBuilder
} from '../../helpers/snapshot-factory';

// Quick test snapshot
const snapshot = createTestSnapshot([
  { uid: 'btn1', role: 'button', name: 'Click Me', level: 1 }
]);

// Custom builder
const custom = new SnapshotBuilder()
  .withUrl('https://test.example.com')
  .withTitle('Test Page')
  .addElement({ uid: 'el1', role: 'textbox', name: 'Email', level: 1 })
  .addElement({ uid: 'el2', role: 'button', name: 'Submit', level: 1 })
  .build();
```

### Selector Validator

Use the selector validator for CSS testing:

```typescript
import {
  validateCssSelector,
  validateHrefPathSelector,
  calculateSpecificity
} from '../../helpers/selector-validator';

test('selector is valid', () => {
  const result = validateCssSelector('.btn-primary');
  expect(result.isValid).toBe(true);
});
```

## Documentation

### Adding Documentation

1. Create markdown file in `docs/`
2. Update `mkdocs.yml` navigation
3. Test locally with `mkdocs serve`

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add mermaid diagrams where helpful
- Link to related pages

## Pull Request Guidelines

### PR Title Format

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Maintenance

### PR Checklist

- [ ] Tests pass (`npm run qa`)
- [ ] Code coverage maintained
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### Review Process

1. Automated checks must pass
2. At least one approval required
3. Address review comments
4. Squash and merge

## Common Tasks

### Adding a New Handler

1. Create handler in `src/handlers/`
2. Add tests in `tests/unit/handlers/`
3. Export from `src/handlers/index.ts`
4. Document in `docs/reference/api.md`

### Adding a New Registry

1. Create registry in `src/registry/`
2. Load data from `skills/xc-console/`
3. Add tests in `tests/unit/registry/`
4. Document in `docs/metadata/`

### Adding a New Workflow

1. Create workflow in `skills/xc-console/workflows/`
2. Add test in `tests/unit/workflows/`
3. Document in `docs/features/workflows.md`

## Troubleshooting

### Tests Fail Locally

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run qa
```

### TypeScript Errors

```bash
# Check types
npm run qa:typecheck

# Rebuild
npm run build
```

### Coverage Drops

```bash
# View coverage report
npm run qa:coverage
open coverage/lcov-report/index.html
```

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/robinmordasiewicz/f5xc-console/issues)
- **Discussions:** [GitHub Discussions](https://github.com/robinmordasiewicz/f5xc-console/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
