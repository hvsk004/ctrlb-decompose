# Chrome Web Store Listing Draft

## Short Description

Analyze selected or pasted log lines in Chrome and turn them into structural patterns, stats, and anomalies.

## Detailed Description

CtrlB Decompose helps engineers inspect raw logs without leaving the browser.

Open the side panel to paste logs or upload a local log file, or select log text on any page and choose **Analyze with CtrlB Decompose** from the context menu.

The extension groups repetitive lines into structural patterns, highlights counts and examples, and lets you switch between human-readable, LLM-friendly, and JSON output.

## Key Features

- Analyze selected text from the current page
- Preserve line breaks for log parsing by reading the live DOM selection
- Paste logs or upload a local log file in the side panel
- Generate human, LLM, or JSON output
- Process log content locally in the browser with WebAssembly

## Notes

- Designed for developers and operators working with multiline logs
- Does not require a backend service to analyze selected text
