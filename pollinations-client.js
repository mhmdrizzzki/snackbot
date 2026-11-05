/**
 * pollinations-client.js — Pollinations text chat (BYOP).
 *
 * The Pollinations model IS the vending machine here: it holds the stock, the
 * credit and the quirks, and decides what a button press does. The visitor
 * approves a scoped key with the official <polli-connect> widget, so each press
 * bills their own Pollen and no secret key is ever pasted into the page.
 *
 * Reference: https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md
 */
(function (root) {
    const API_URL = "https://gen.pollinations.ai/v1/chat/completions";
    const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

    async function chatCompletion(messages, opts) {
        const { apiKey, model = DEFAULT_MODEL, maxTokens = 700, temperature } = opts || {};
        if (!apiKey) {
            throw new Error("Missing Pollinations key — approve one with the Connect button first.");
        }
        const body = {
            model,
            messages: messages.map((m) => ({
                role: m.role,
                content: String(m.content).slice(0, 12000),
            })),
            max_tokens: maxTokens,
        };
        if (typeof temperature === "number") body.temperature = temperature;

        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            let detail = "";
            try {
                const j = await res.json();
                detail = (j.error && (j.error.message || j.error)) || "";
            } catch (_err) { /* not JSON */ }
            throw new Error("Pollinations API error " + res.status + (detail ? " — " + detail : ""));
        }
        const data = await res.json();
        const choice = (data.choices && data.choices[0]) || {};
        const text = choice.message && choice.message.content;
        if (text === undefined || text === null || text === "") {
            throw new Error("Pollinations returned an empty reply.");
        }
        return String(text).trim();
    }

    /** Pull the first JSON object out of a reply that may be wrapped in prose or fences. */
    function parseJsonObject(text) {
        const cleaned = String(text).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start === -1 || end === -1 || end < start) {
            throw new Error("The machine did not answer with the expected JSON.");
        }
        return JSON.parse(cleaned.slice(start, end + 1));
    }

    root.PolliClient = { API_URL, DEFAULT_MODEL, chatCompletion, parseJsonObject };
})(typeof self !== "undefined" ? self : globalThis);
