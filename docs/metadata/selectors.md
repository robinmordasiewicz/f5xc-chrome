# Selector Reference

This page documents the selector types and their usage in the plugin.

## Selector Priority Chain

{{ selector_priority() }}

## Selector Types

### data_testid

**Stability**: Highest

Testing attributes added by developers. Most stable but often not available.

```html
<button data-testid="add-lb-btn">Add Load Balancer</button>
```

```javascript
// CSS selector
[data-testid="add-lb-btn"]
```

### aria_label

**Stability**: High

Accessibility labels. Stable and often available for interactive elements.

```html
<button aria-label="Add Load Balancer">+</button>
```

```javascript
// CSS selector
[aria-label="Add Load Balancer"]
```

### text_match

**Stability**: Medium

Text content matching using `find()` tool.

```javascript
// find() query
"Add HTTP Load Balancer"
```

### css

**Stability**: Medium

CSS selectors for complex matching patterns.

```javascript
// With text matching
"button:has-text('Add HTTP Load Balancer')"

// With class and structure
".workspace-card:has-text('Web App')"

// With input type
"input[type='search']"
```

### ref

**Stability**: Session-only

Session-specific element references. Only valid within the session they were captured.

```javascript
"ref_27"
```

!!! warning "Session Dependency"
    Refs are captured during crawl and may become stale. Always prefer stable selectors.

## Selector Metadata Structure

Each element in the metadata includes all selector types:

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

When locating an element, the plugin tries selectors in priority order:

```python
def find_element(metadata):
    selectors = metadata["selectors"]

    # 1. Try data_testid (most stable)
    if selectors.get("data_testid"):
        return find_by_css(f'[data-testid="{selectors["data_testid"]}"]')

    # 2. Try aria_label
    if selectors.get("aria_label"):
        return find_by_css(f'[aria-label="{selectors["aria_label"]}"]')

    # 3. Try text_match
    if selectors.get("text_match"):
        return find_by_text(selectors["text_match"])

    # 4. Try css selector
    if selectors.get("css"):
        return find_by_css(selectors["css"])

    # 5. Try session ref (may be stale)
    if metadata.get("ref"):
        return find_by_ref(metadata["ref"])

    # 6. Report failure
    raise ElementNotFoundError()
```

## Improving Selector Coverage

### Current Coverage

The crawl summary shows selector coverage:

```json
{
  "crawl_summary": {
    "total_refs": 150,
    "elements_with_stable_selectors": 45,
    "selector_coverage_percentage": 30
  }
}
```

### Running a Crawl

To improve coverage, run a fresh crawl:

```bash
/xc:console crawl https://yourname.console.ves.volterra.io
```

The crawl extracts all available selector types for each element.

## Best Practices

1. **Prefer stable selectors** - Use data_testid or aria_label when available
2. **Use text_match as fallback** - Good for buttons and links
3. **Avoid css selectors** - They're fragile to UI changes
4. **Never rely on refs alone** - They expire between sessions
5. **Re-crawl after UI updates** - Refresh metadata when the console changes
