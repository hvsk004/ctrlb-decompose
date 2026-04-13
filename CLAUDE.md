# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build (CLI, default features)
cargo build --release

# Run tests (unit + integration)
cargo test --locked

# Run a single test by name
cargo test test_pipeline_basic

# Lint (CI enforces zero warnings)
cargo clippy -- -D warnings

# Check WASM target (no I/O, no CLI deps)
cargo check --target wasm32-unknown-unknown --no-default-features --features wasm

# Check library-only (no CLI, no WASM)
cargo check --no-default-features

# Run benchmarks
cargo bench

# Run CLI from source
cargo run -- --llm tests/fixtures/sample.log
cat tests/fixtures/sample.log | cargo run -- --no-banner -q
```

Snapshot tests use `insta` — run `cargo insta review` to accept updated snapshots.

## Architecture

The crate compiles to three targets via feature flags:
- **`default` / `cli`**: binary with `clap` + `colored`
- **`wasm`**: `cdylib` with `wasm-bindgen`, no filesystem I/O
- **no features**: pure library (usable as Rust dependency)

### Processing Pipeline

Every log line flows through this sequence (in `src/lib.rs` → `process_log_text` / `run`):

```
Raw line
  → timestamp extraction + stripping  (src/timestamp.rs)
  → CLP encoding: variables → typed placeholders  (src/extraction/clp/)
  → Drain3 clustering: logtypes → structural patterns  (src/extraction/drain3.rs)
  → variable merging: CLP values + Drain3 wildcards  (src/extraction/pipeline.rs)
  → stats accumulation: DDSketch, HyperLogLog, reservoir sampling  (src/stats.rs)
  → finalize → anomaly detection → scoring  (src/anomaly.rs, src/scoring.rs)
  → format output  (src/format/)
```

`ClpDrainPipeline` in `src/extraction/pipeline.rs` is the core struct that owns both the CLP encoder and Drain tree. It processes lines one at a time with no second pass.

### Key Types

- `PatternID` (`usize`) — stable ID assigned by Drain3 to each discovered cluster
- `VarType` — semantic classification of extracted variables (IPv4, UUID, Duration, Enum, etc.)
- `FormatOptions` — decoupled from CLI args; used by formatters and the WASM entry point
- `PatternStore` (`src/stats.rs`) — accumulates per-pattern statistics across all lines

### Feature Gating

CLI-only code (file I/O, `clap`, `colored`) is `#[cfg(feature = "cli")]` throughout `src/lib.rs`. The WASM entry point lives in `src/wasm.rs` and calls `process_log_text`, which is the same function used by the library API. Do not add filesystem or stdout access outside the CLI feature gate.

### Output Formats

Three formatters under `src/format/`: `human.rs` (ANSI terminal), `llm.rs` (compact markdown), `json.rs` (structured). All receive the same `PatternStore` + `scores` and are selected by `OutputMode`.

### Claude Code Plugin

`plugin/skills/analyze-logs/SKILL.md` defines a Claude Code skill for end-users to analyze logs via natural language. `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` define the plugin metadata. Plugin changes are independent of the Rust crate.
