# Reviewer Notes

## Single Purpose

CtrlB Decompose is a log analysis extension. It lets users analyze selected, pasted, or uploaded log text and view grouped patterns in a side panel.

## Why `activeTab` and `scripting` Are Required

The extension provides a context-menu action for selected text. When the user chooses **Analyze with CtrlB Decompose**, the service worker uses `chrome.scripting.executeScript()` on the active tab to read the live DOM selection and preserve line breaks.

This is required because `info.selectionText` can flatten whitespace and line breaks, which degrades multiline log parsing.

Access is:

- user-triggered only
- limited to the active tab
- temporary through `activeTab`
- used only to extract the selected text for immediate analysis

If injection is not allowed on a page, the extension falls back to `info.selectionText`.

## Data Handling

- Selected text is processed locally in the extension via WebAssembly
- No selected text is sent to remote servers
- `chrome.storage.session` is used only to pass selected text to the side panel
- `chrome.storage.local` stores the user's theme preference

## Reviewer Test Steps

1. Open a webpage containing multiline log text.
2. Select several log lines.
3. Right-click and choose **Analyze with CtrlB Decompose**.
4. Confirm the side panel opens and shows grouped analysis results.
5. Open the side panel directly and verify pasted or uploaded log files can also be analyzed locally.
