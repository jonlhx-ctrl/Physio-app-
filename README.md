# Physio Voice Intake Assistant

A modern static web app for **initial physiotherapy assessments** where patients can **type or speak** with an AI-style intake guide.

## Features

- Conversational intake for patients with guided clinical questioning.
- Captures core assessment data:
  - pain level (0-10),
  - duration/onset,
  - easing factors,
  - aggravation factors,
  - affected body part details,
  - pain quality and clarifying symptoms,
  - functional impact.
- Multilingual interface + speech recognition language support.
- Auto-generated physiotherapist summary with likely issue hypotheses.
- Red-flag keyword screening and suggested follow-up actions.

## Run locally

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173>.

## Important note

This tool supports intake and triage only. It does **not** provide medical diagnosis.
