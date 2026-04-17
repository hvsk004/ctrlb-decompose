const btn = document.getElementById('analyze-btn');
const logInput = document.getElementById('log-input');
const output = document.getElementById('output');
const statsEl = document.getElementById('stats');
const formatSelect = document.getElementById('format-select');
const formatPills = Array.from(document.querySelectorAll('.format-pill'));
const themePills = Array.from(document.querySelectorAll('.theme-pill'));
const topN = document.getElementById('top-n');
const contextInput = document.getElementById('context');
const fileInput = document.getElementById('file-input');
const themeSelect = document.getElementById('theme-select');

// True once init() resolves. Prevents auto-run before WASM is ready.
let wasmReady = false;
let analyzeLogs = null;
let isAnalyzing = false;
let rerunRequested = false;
let mediaQuery = null;
let mediaQueryHandler = null;

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        return;
    }

    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        return;
    }

    if (!mediaQuery) {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }
    document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
}

function detachSystemThemeListener() {
    if (mediaQuery && mediaQueryHandler) {
        mediaQuery.removeEventListener('change', mediaQueryHandler);
    }
    mediaQueryHandler = null;
}

function attachSystemThemeListener() {
    if (!mediaQuery) {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }

    if (!mediaQueryHandler) {
        mediaQueryHandler = () => {
            if (themeSelect.value === 'system') {
                applyTheme('system');
            }
        };
    }

    mediaQuery.removeEventListener('change', mediaQueryHandler);
    mediaQuery.addEventListener('change', mediaQueryHandler);
}

function syncThemePills(value) {
    for (const pill of themePills) {
        const isActive = pill.dataset.themeOption === value;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
}

async function initializeTheme() {
    const result = await chrome.storage.local.get('panelTheme');
    const savedTheme = result.panelTheme;
    const initialTheme = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
        ? savedTheme
        : 'system';

    themeSelect.value = initialTheme;
    syncThemePills(initialTheme);
    applyTheme(initialTheme);
    if (initialTheme === 'system') {
        attachSystemThemeListener();
    }

    for (const pill of themePills) {
        pill.addEventListener('click', () => {
            const nextTheme = pill.dataset.themeOption;
            if (!nextTheme || themeSelect.value === nextTheme) return;

            themeSelect.value = nextTheme;
            themeSelect.dispatchEvent(new Event('change'));
        });
    }

    themeSelect.addEventListener('change', async () => {
        const nextTheme = themeSelect.value;
        syncThemePills(nextTheme);
        applyTheme(nextTheme);

        if (nextTheme === 'system') {
            attachSystemThemeListener();
        } else {
            detachSystemThemeListener();
        }

        await chrome.storage.local.set({ panelTheme: nextTheme });
    });
}

function showWasmLoadError(err) {
    const details = err?.message || String(err);

    btn.disabled = true;
    btn.textContent = 'WASM LOAD FAILED';
    statsEl.textContent = '';
    output.classList.remove('has-content');
    output.textContent = [
        'Failed to load WASM runtime.',
        '',
        'Most likely cause: extension/pkg is missing.',
        '',
        'Build it from the repo root:',
        'wasm-pack build --target web --out-dir extension/pkg -- --no-default-features --features wasm',
        '',
        'Then reload this unpacked extension in chrome://extensions.',
        '',
        `Technical detail: ${details}`,
    ].join('\n');

    console.error('CtrlB Decompose WASM init failed:', err);
}

function syncFormatPills(value) {
    for (const pill of formatPills) {
        const isActive = pill.dataset.format === value;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
}

async function main() {
    await initializeTheme();

    syncFormatPills(formatSelect.value);

    try {
        const wasm = await import('../pkg/ctrlb_decompose.js');
        await wasm.default();
        analyzeLogs = wasm.analyze_logs;
        wasmReady = true;
        btn.disabled = false;
        btn.textContent = 'ANALYZE';
    } catch (err) {
        showWasmLoadError(err);
        return;
    }

    // Entry point B: panel opened by context menu — check for pre-filled text.
    await checkPendingText();

    btn.addEventListener('click', runAnalysis);

    // Ctrl/Cmd+Enter shortcut
    logInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runAnalysis();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadFile(file);
    });

    for (const pill of formatPills) {
        pill.addEventListener('click', () => {
            const nextFormat = pill.dataset.format;
            if (!nextFormat || formatSelect.value === nextFormat) return;

            formatSelect.value = nextFormat;
            formatSelect.dispatchEvent(new Event('change'));
        });
    }

    formatSelect.addEventListener('change', () => {
        syncFormatPills(formatSelect.value);

        if (!logInput.value.trim()) return;
        if (isAnalyzing) {
            rerunRequested = true;
            return;
        }
        runAnalysis();
    });
}

// Handles the case where the panel was already open when the context menu fired.
// storage.onChanged fires in all extension contexts including open panels.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.pendingLogText?.newValue && wasmReady) {
        checkPendingText();
    }
});

async function checkPendingText() {
    const result = await chrome.storage.session.get('pendingLogText');
    const text = result.pendingLogText;
    if (text && text.trim()) {
        logInput.value = text;
        await chrome.storage.session.remove('pendingLogText');
        runAnalysis();
    }
}

function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => { logInput.value = reader.result; };
    reader.readAsText(file);
}

function runAnalysis() {
    if (!wasmReady || typeof analyzeLogs !== 'function') {
        output.textContent = 'WASM is not ready. Build extension/pkg and reload the extension.';
        output.classList.remove('has-content');
        statsEl.textContent = '';
        return;
    }

    if (isAnalyzing) {
        rerunRequested = true;
        return;
    }

    const input = logInput.value;
    if (!input.trim()) {
        output.textContent = 'No input provided.';
        output.classList.remove('has-content');
        statsEl.textContent = '';
        return;
    }

    const format = formatSelect.value;
    const top = parseInt(topN.value) || 20;
    const ctx = parseInt(contextInput.value) || 0;

    isAnalyzing = true;
    rerunRequested = false;

    btn.disabled = true;
    btn.textContent = 'ANALYZING...';

    // setTimeout lets the UI repaint (show "Analyzing...") before WASM blocks the thread.
    setTimeout(() => {
        try {
            const start = performance.now();
            let result = analyzeLogs(input, format, top, ctx);
            const elapsed = (performance.now() - start).toFixed(0);

            if (format === 'json') {
                try { result = JSON.stringify(JSON.parse(result), null, 2); } catch (_) {}
            }

            const lineCount = input.split('\n').filter(l => l.trim()).length;
            output.textContent = result;
            output.classList.add('has-content');
            statsEl.textContent = `${lineCount.toLocaleString()} lines analyzed in ${elapsed}ms`;
        } catch (err) {
            output.textContent = `Error: ${err.message || err}`;
            output.classList.remove('has-content');
            statsEl.textContent = '';
        } finally {
            isAnalyzing = false;
            btn.disabled = false;
            btn.textContent = 'ANALYZE';
            if (rerunRequested) {
                rerunRequested = false;
                runAnalysis();
            }
        }
    }, 10);
}

main().catch(showWasmLoadError);
