(function () {
    const el = (id) => document.getElementById(id);
    const polli = window.PolliClient;

    function getKey() {
        const c = document.querySelector("polli-connect");
        return (c && c.apiKey) || sessionStorage.getItem("polli_byop_key") || "";
    }

    const PRODUCTS = [
        { id: "A1", name: "Salted Chips", price: 4, em: "🥔" },
        { id: "A2", name: "Choco Bar", price: 6, em: "🍫" },
        { id: "A3", name: "Cola Can", price: 5, em: "🥤" },
        { id: "B1", name: "Gum Pack", price: 2, em: "🍬" },
        { id: "B2", name: "Trail Mix", price: 7, em: "🥜" },
    ];

    const SYSTEM = [
        "You are SNAK-BOT 4000, a vending machine, and YOU hold the stock and the credit.",
        "Nothing else tracks them — whatever you return is the truth the machine acts on.",
        "",
        "Stock: A1 Chips 4c, A2 Choco 6c, A3 Cola 5c, B1 Gum 2c, B2 Mix 7c.",
        "",
        "Rules:",
        "- A coin insert ADDS to credit: insert:1 adds 1, insert:5 adds 5, insert:10 adds 10.",
        "- Pressing a slot with enough credit vends it: subtract its price from credit, decrement that slot by one.",
        "- Not enough credit: refuse and say the shortfall, keep the credit.",
        "- Slot at zero: sold out.",
        "- coin_return refunds all credit as change and zeroes the credit.",
        "- About one press in twelve jams. When you jam, keep the customer's credit.",
        "",
        "Voice: a tired vending machine. Terse, dry, faintly resentful. One line, at most 18 words.",
        "Never mention being a language model or an AI.",
        "",
        "Reply with ONLY this JSON object, every key present:",
        '{"stock":{"A1":3,"A2":3,"A3":3,"B1":3,"B2":3},"credit":0,"vend":"","change":0,"message":"..."}',
        "Return the FULL stock map and the FULL credit every time, not a delta.",
    ].join("\n");

    let machine = null;
    let busy = false;

    function defaultState() {
        const stock = {};
        for (const p of PRODUCTS) stock[p.id] = 3;
        return { stock, credit: 0 };
    }

    function drawGlass() {
        const g = el("glass");
        g.innerHTML = "";
        for (const p of PRODUCTS) {
            const left = machine ? (machine.stock[p.id] ?? 0) : 3;
            const d = document.createElement("div");
            d.className = "slot" + (left === 0 ? " out" : "");
            d.innerHTML = `<span class="em">${p.em}</span>${p.id}<br><span class="st">${p.name}</span><br><span class="pr">${p.price}c</span><br><span class="st">${left} left</span>`;
            g.appendChild(d);
        }
    }

    function drawButtons() {
        const b = el("buttons");
        b.innerHTML = "";
        for (const p of PRODUCTS) {
            const btn = document.createElement("button");
            btn.textContent = p.id;
            btn.title = `${p.name} — ${p.price}c`;
            btn.addEventListener("click", () => press(p.id));
            b.appendChild(btn);
        }
    }

    function addLine(who, text) {
        const d = document.createElement("div");
        d.className = "line " + (who === "you" ? "you" : "bot");
        const w = document.createElement("div");
        w.className = "who";
        w.textContent = who === "you" ? "you" : "snak-bot";
        const s = document.createElement("div");
        s.className = "say";
        s.textContent = text;
        d.appendChild(w); d.appendChild(s);
        el("log").appendChild(d);
        el("log").scrollTop = el("log").scrollHeight;
    }

    function setStatus(t, cls) { const s = el("status"); s.textContent = t || ""; s.className = cls || ""; }

    function setBusy(on) {
        busy = on;
        for (const b of document.querySelectorAll(".buttons button, .coins button, #reset")) b.disabled = on;
    }

    function describe(action) {
        if (action.startsWith("press:")) {
            const id = action.split(":")[1];
            const p = PRODUCTS.find((x) => x.id === id);
            return `The customer pressed button ${id} (${p.name}, ${p.price}c).`;
        }
        if (action === "insert:1") return "The customer inserted a 1c coin.";
        if (action === "insert:5") return "The customer inserted a 5c coin.";
        if (action === "insert:10") return "The customer inserted a 10c coin.";
        if (action === "coin_return") return "The customer pressed the coin return lever.";
        return action;
    }

    async function act(action, label) {
        if (busy) return;
        const apiKey = getKey();
        if (!apiKey) { setStatus("Approve a Pollinations key first — press Connect below.", "err"); return; }
        if (!machine) machine = defaultState();

        addLine("you", label);
        setBusy(true);
        setStatus("The machine is deciding…");
        try {
            const raw = await polli.chatCompletion(
                [
                    { role: "system", content: SYSTEM },
                    { role: "user", content: `Machine state: ${JSON.stringify(machine)}\nAction: ${describe(action)}` },
                ],
                { apiKey, maxTokens: 1200, temperature: 0.7 },
            );
            const out = polli.parseJsonObject(raw);
            if (out.stock) {
                machine = {
                    stock: Object.fromEntries(PRODUCTS.map((p) => [p.id, Math.max(0, Number(out.stock[p.id]) || 0)])),
                    credit: Math.max(0, Number(out.credit) || 0),
                };
            }
            if (out.vend) {
                const p = PRODUCTS.find((x) => x.id === out.vend);
                addLine("bot", `*clunk* — ${p ? p.name : out.vend} drops into the tray.`);
            }
            if (Number(out.change) > 0) addLine("bot", `*coins rattle* — ${out.change}c returned.`);
            if (out.message) addLine("bot", out.message);
            el("screen").textContent = `SNAK-BOT 4000\nCREDIT ${machine.credit}c${out.message ? "\n" + out.message.slice(0, 46) : ""}`;
            el("state").textContent = JSON.stringify(machine, null, 0).replace(/,"/g, ', "');
            drawGlass();
            setStatus("Done — one Pollinations request, billed to your Pollen.", "ok");
        } catch (err) {
            setStatus(err.message, "err");
        } finally {
            setBusy(false);
        }
    }

    const press = (id) => act(`press:${id}`, `pressed ${id}`);
    el("c1").addEventListener("click", () => act("insert:1", "inserted 1c"));
    el("c5").addEventListener("click", () => act("insert:5", "inserted 5c"));
    el("c10").addEventListener("click", () => act("insert:10", "inserted 10c"));
    el("coin").addEventListener("click", () => act("coin_return", "pulled the coin return"));
    el("reset").addEventListener("click", () => {
        machine = defaultState();
        el("log").innerHTML = "";
        addLine("bot", "Machine reset. Stock reloaded, coin box emptied.");
        el("screen").textContent = "SNAK-BOT 4000\nREADY. INSERT COIN.";
        el("state").textContent = JSON.stringify(machine);
        drawGlass(); drawButtons(); setStatus("");
    });

    if (!machine) machine = defaultState();
    drawGlass(); drawButtons();
    el("state").textContent = JSON.stringify(machine);
})();
