pub mod human;
pub mod json;
pub mod llm;

use std::collections::HashMap;

use crate::scoring::PatternScore;
use crate::stats::PatternStore;
use crate::types::{FormatOptions, OutputMode, PatternID};

pub fn format_output(
    store: &PatternStore,
    opts: &FormatOptions,
    scores: &HashMap<PatternID, PatternScore>,
) -> String {
    match opts.output_mode {
        OutputMode::Human => human::format(store, opts, scores),
        OutputMode::Llm => llm::format(store, opts, scores),
        OutputMode::Json => json::format(store, opts, scores),
    }
}
