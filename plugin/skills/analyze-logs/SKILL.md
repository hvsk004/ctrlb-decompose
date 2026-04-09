---
name: analyze-logs
description: >
  Analyze log files or raw log text using ctrlb-decompose. Use when the user
  asks to: analyze logs, investigate errors in log files, understand log patterns,
  summarize a log file, detect anomalies, or identify the most common log events.
---

# ctrlb-decompose Log Analysis

## Before you begin — large log volumes

**If the user signals they are about to paste log content** (e.g. "here are my
logs", "let me paste some logs"), ask first:

> About how many lines are you sharing? If it's more than ~100 lines, it's much
> better to save them to a file and share the path — it keeps the conversation
> context clean and ctrlb-decompose handles the file directly.
> 
> ```bash
> # Save your logs to a file, then share the path:
> ctrlb-decompose --llm --top 20 /path/to/your.log
> ```

Only proceed with pasted content if:
- The user insists on pasting, or
- The volume is clearly small (a handful of lines)

**After processing any pasted content:** do not quote, repeat, or reference
individual raw log lines in your response. ctrlb-decompose already compressed
them — treat the raw input as consumed and work only from the tool output.

---

## Step 1 — Check installation

Run:
```bash
which ctrlb-decompose
```

If found, skip to Step 2.

If not found, detect the OS and offer to install:

```bash
uname -s
```

### macOS (Darwin)

Check if Homebrew is available:
```bash
which brew
```

If Homebrew is available, ask the user:
> ctrlb-decompose is not installed. I can install it via Homebrew. May I run:
> ```
> brew tap ctrlb-hq/tap && brew install ctrlb-decompose
> ```

If the user approves, run it, then verify with `which ctrlb-decompose`.

If Homebrew is not installed, offer to install it first:
> Homebrew is not installed either. I can install Homebrew and then ctrlb-decompose.
> This will require your password. May I proceed?

If approved, run the official Homebrew installer, then install ctrlb-decompose.

### Linux

Check the distro:
```bash
cat /etc/os-release
```

**Debian / Ubuntu** (`ID=debian`, `ID=ubuntu`, or `ID_LIKE` contains `debian`):
> ctrlb-decompose is not installed. May I run the following to install it?
> ```
> curl -LO https://github.com/ctrlb-hq/ctrlb-decompose/releases/latest/download/ctrlb-decompose_amd64.deb && sudo dpkg -i ctrlb-decompose_amd64.deb
> ```

**RHEL / Fedora / CentOS** (`ID` is `rhel`, `fedora`, or `centos`):
> ctrlb-decompose is not installed. May I run:
> ```
> curl -LO https://github.com/ctrlb-hq/ctrlb-decompose/releases/latest/download/ctrlb-decompose_amd64.rpm && sudo rpm -i ctrlb-decompose_amd64.rpm
> ```

**Other Linux** (generic binary):
> May I download the ctrlb-decompose binary and place it in /usr/local/bin?
> ```
> curl -LO https://github.com/ctrlb-hq/ctrlb-decompose/releases/latest/download/ctrlb-decompose-linux-x86_64 && chmod +x ctrlb-decompose-linux-x86_64 && sudo mv ctrlb-decompose-linux-x86_64 /usr/local/bin/ctrlb-decompose
> ```

### Fallback — build from source

If any installation method fails (wrong architecture, missing binary for the
platform, package manager errors, download failures), offer to build from source:

> Installation did not succeed. As a fallback, I can clone the repository and
> build ctrlb-decompose from source. This requires `git` and the Rust toolchain.
> May I proceed?

Check prerequisites:
```bash
which git && which cargo
```

If `cargo` is missing, offer to install Rust first:
> The Rust toolchain (`cargo`) is not installed. May I install it via rustup?
> ```
> curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source "$HOME/.cargo/env"
> ```

Once prerequisites are confirmed and approved, clone and build:
```bash
git clone https://github.com/ctrlb-hq/ctrlb-decompose.git /tmp/ctrlb-decompose-build \
  && cd /tmp/ctrlb-decompose-build \
  && cargo build --release \
  && sudo cp target/release/ctrlb-decompose /usr/local/bin/ctrlb-decompose \
  && cd / && rm -rf /tmp/ctrlb-decompose-build
```

Ask permission before each step if the user has not already given blanket approval.

### After installation

Run `which ctrlb-decompose` to confirm success, then continue to Step 2.

---

## Step 2 — Run analysis

Run ctrlb-decompose in LLM-optimized output mode.

**When the user provides a file path:**
```bash
ctrlb-decompose --llm --top 20 "$FILE_PATH"
```

**When the user pastes log text directly in the conversation:**

Use the Write tool to save the pasted content to `/tmp/ctrlb_input.log` (this
handles multi-line text, special characters, and quotes correctly), then run:
```bash
ctrlb-decompose --llm --top 20 /tmp/ctrlb_input.log && rm /tmp/ctrlb_input.log
```

Use `--top 20` by default. If the user wants to see more patterns, use `--top 50`.

---

## Step 3 — Interpret results

After running, summarize the output for the user:

1. **Lead with problems** — highlight ERROR, FATAL, and WARN severity patterns first
2. **Call out anomalies** — frequency spikes, high error rates, low-cardinality variables
3. **Summarize key variables** — most common IPs, slowest durations (p99), notable enum values
4. **Suggest next steps** — which patterns warrant further investigation and why
