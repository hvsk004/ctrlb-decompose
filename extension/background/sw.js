chrome.runtime.onInstalled.addListener(() => {
    // Open the side panel when the user clicks the toolbar icon.
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // Register the right-click context menu item (appears only when text is selected).
    chrome.contextMenus.create({
        id: 'ctrlb-analyze',
        title: 'Analyze with CtrlB Decompose',
        contexts: ['selection'],
    });
});

function normalizeSelectionText(text) {
    return String(text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ');
}

async function getSelectionFromPage(tabId, frameId) {
    if (!Number.isInteger(tabId)) return '';

    const target = { tabId };
    if (Number.isInteger(frameId) && frameId >= 0) {
        target.frameIds = [frameId];
    }

    const results = await chrome.scripting.executeScript({
        target,
        func: () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return '';

            const chunks = [];
            for (let i = 0; i < selection.rangeCount; i += 1) {
                const range = selection.getRangeAt(i);
                const container = document.createElement('div');
                container.appendChild(range.cloneContents());

                let text = container.innerText;
                if (!text) text = container.textContent || '';
                if (text) chunks.push(text);
            }

            return chunks.join('\n');
        },
    });

    return normalizeSelectionText(results?.[0]?.result || '');
}

async function openSidePanelForContext(tab) {
    if (Number.isInteger(tab?.id)) {
        await chrome.sidePanel.open({ tabId: tab.id });
        return;
    }

    if (Number.isInteger(tab?.windowId)) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        return;
    }

    throw new Error('No tabId or windowId available for side panel open().');
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'ctrlb-analyze') return;

    const openPanelPromise = openSidePanelForContext(tab).catch((err) => {
        console.warn('Could not auto-open side panel from context menu:', err);
    });

    let text = '';

    try {
        text = await getSelectionFromPage(tab?.id, info.frameId);
    } catch (err) {
        console.warn('Could not read DOM selection, falling back to selectionText:', err);
    }

    if (!text.trim()) {
        text = normalizeSelectionText(info.selectionText || '');
    }

    if (text.trim()) {
        // Write selected text; panel.js reads on load and on storage changes.
        await chrome.storage.session.set({ pendingLogText: text });
    }

    await openPanelPromise;
});
