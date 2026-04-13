# Privacy Disclosure Draft

CtrlB Decompose processes log text locally in the browser.

## Data Handling

- Selected text is read only after the user explicitly invokes the context menu item.
- Pasted text and uploaded files are processed locally in the side panel.
- Selected or pasted log content is not sent to CtrlB or any third-party server.
- The extension does not use remote code.

## Storage

- `chrome.storage.session` temporarily stores selected text so the service worker can hand it to the side panel.
- `chrome.storage.local` stores the user's theme preference.
- Temporary selected text is removed after the side panel reads it.

## Permissions

- `sidePanel`: shows the analyzer UI in Chrome's side panel
- `contextMenus`: adds the “Analyze with CtrlB Decompose” action for selected text
- `storage`: passes selected text to the side panel and stores theme preference
- `scripting` and `activeTab`: read the live DOM selection with line breaks preserved, only after a user gesture on the active tab

## Data Sales and Advertising

- No sale of user data
- No advertising behavior
- No background collection of browsing activity
