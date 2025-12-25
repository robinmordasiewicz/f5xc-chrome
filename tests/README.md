# F5 XC Console Plugin Tests

Test infrastructure for validating F5 XC console automation workflows.

## Directory Structure

```
tests/
├── workflows/           # Workflow validation tests
│   └── test-http-lb-create.md
├── fixtures/            # Mock data and responses
│   └── console-responses.json
└── README.md
```

## Running Tests

### Manual Workflow Validation

Each workflow test in `workflows/` describes:
- Prerequisites for the test
- Steps to execute
- Expected outcomes
- Validation criteria

### Using Fixtures

Fixtures in `fixtures/` provide:
- Sample console page structures
- Expected navigation paths
- Mock form field values

## Test Patterns

### Workflow Tests

Workflow tests follow this pattern:

1. **Setup**: Ensure prerequisites (logged in, correct tenant)
2. **Execute**: Run the workflow steps
3. **Verify**: Check expected outcomes
4. **Cleanup**: Remove test resources if needed

### Example Test Execution

```bash
# Navigate to test tenant
/xc:console login https://test.console.ves.volterra.io/

# Run workflow being tested
/xc:console create http-lb --name test-lb --origin test-pool

# Verify creation
/xc:console status http-lb test-lb

# Cleanup
/xc:console delete http-lb test-lb
```

## Adding New Tests

1. Create a new `.md` file in `workflows/`
2. Document prerequisites and steps
3. Add expected outcomes
4. Include cleanup instructions
