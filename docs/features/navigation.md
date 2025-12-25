# Navigation

The plugin provides deterministic navigation using pre-crawled metadata.

## Selector Priority Chain

{{ selector_priority() }}

## How It Works

### Before v2.2 (Session-Specific Refs)

```
Claude: Uses ref_27 from metadata
Risk: Refs change between browser sessions
Result: ~70% success rate
```

### After v2.2 (Stable Selectors)

```
Claude: Uses data_testid > aria_label > text_match fallback
Uses: mcp__claude-in-chrome__find with stable selector
Result: ~95% success rate across sessions
```

## Navigation Commands

### Basic Navigation

```bash
/xc:console nav home      # Go to console home
/xc:console nav waap      # Go to WAAP workspace
/xc:console nav http-lb   # Go to HTTP Load Balancers
```

### Workspace Shortcuts

{{ workspace_mapping() }}

## Element Metadata Structure

Each element includes both refs and stable selectors:

```json
{
  "add_button": {
    "ref": "ref_27",
    "text": "Add HTTP Load Balancer",
    "selectors": {
      "data_testid": null,
      "aria_label": "Add HTTP Load Balancer",
      "text_match": "Add HTTP Load Balancer",
      "css": "button:has-text('Add HTTP Load Balancer')"
    }
  }
}
```

## Fallback Strategy

When navigating, Claude uses this priority:

1. Try `data_testid` selector (most stable)
2. Try `aria_label` selector
3. Try `text_match` with find()
4. Try `css` selector
5. Try session-specific `ref` (may be stale)
6. Report mismatch for metadata update
