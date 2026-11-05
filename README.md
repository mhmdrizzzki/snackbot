# Snackbot

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

A vending machine whose entire brain is a language model. You insert coins, press a
slot, and the model — not the page — decides what the machine does. It holds the stock,
the credit and the change, and it can jam.

Built for quest [#19179](https://github.com/pollinations/pollinations/issues/19179)
(an app, game or tool where an AI model plays the part of a computer, a program or a world).

## The model is the machine

The page owns no accounting. On every press it sends the current machine state and the
customer's action, and the model returns the **whole new state** — stock map, credit, what
vended, the change, and one line of dialogue:

```json
{"stock":{"A1":3,"A2":3,"A3":2,"B1":3,"B2":3},"credit":0,"vend":"A3","change":0,"message":"Here's your cola. Don't loiter."}
```

The page only renders that state. If the model decides a press jams, the machine jams —
that is the game, not a defect in the page.

## A prompt-shape finding worth recording

The first version nested the state: `{"state":{"stock":{…},"credit":…}, …}`. On that shape
`deepseek/deepseek-v4-flash` reliably narrated the right answer while returning the **wrong
numbers** — it said “Credit 5. Pick a slot.” and returned `credit: 0`, so the next press was
refused as if no coin had gone in. It also spent its whole output budget reasoning and came
back with *“The model exhausted its output token limit…”*.

Flattening the object fixed both: the same model then tracked `0 → 5 → 0`, vended A3 and
decremented its stock, in 185 and 565 output tokens. A nested state object costs accuracy and
tokens; a flat one does not.

## Bring Your Own Pollen (BYOP)

Visitors do not paste a secret key. The page uses the official `<polli-connect>` widget:

1. Press **Connect** and approve a scoped key on the Pollinations consent screen
   (`text` models, budget **5 Pollen**, expires after **7 days**).
2. Every button press is one chat completion billed to the visitor's own Pollen.
3. The grant is revocable any time from the Pollinations dashboard.

Reference: [BRING_YOUR_OWN_POLLEN.md](https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md)

## Run locally

Static files, no build step:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```
