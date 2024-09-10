export function main() {
    makeUI();
}

type codes = { tree: node };

type leaf = { value: string; freq: number };

type node = leaf | { left: node | leaf; right: node | leaf };

function $<K extends keyof HTMLElementTagNameMap>(
    name: K,
    attrs?: Record<string, any>,
    content?: string | Node | Node[]
): HTMLElementTagNameMap[K] {
    const e = document.createElement(name);

    if (attrs != null)
        for (const [key, value] of Object.entries(attrs)) {
            e.setAttribute(key, value);
        }

    if (content != null && content instanceof Node) e.appendChild(content);
    else if (content != null && content instanceof Array) content.forEach((x) => e.appendChild(x));
    else if (content != null) e.innerText = content;

    return e;
}

function makeUI() {
    let input = $("textarea", { cols: 45, rows: 15 });
    let output = $("div", {});

    input.addEventListener("keyup", () => render(calc(input.value), output));

    let form = $("div", {}, [input, output]);

    input.value = "To steal ideas from one person is plagiarism; to steal from many is research.";
    render(calc(input.value), output);
    document.body.appendChild(form);
}

function calc(text: string): codes {
    let freqs: { [key: string]: number } = {};

    for (let char of text.split("")) {
        if (!(char in freqs)) freqs[char] = 1;
        else freqs[char]++;
    }

    let a: { count: number; node: node }[] = [];
    for (let char in freqs) {
        a.push({ count: freqs[char], node: { value: char, freq: freqs[char] / text.length } });
    }

    if (a.length > 1)
        do {
            a.sort((a, b) => a.count - b.count);
            a.splice(0, 2, { count: a[0].count + a[1].count, node: { left: a[0].node, right: a[1].node } });
        } while (a.length > 1);

    let res = { tree: a[0].node };
    return res;
}

function render(huff: codes, output: HTMLDivElement) {
    const acc: [string, string, number][] = [];
    renderNode(acc, huff.tree, "");
    acc.sort(([a], [b]) => (a.length == b.length ? a.localeCompare(b) : a.length - b.length));
    output.innerHTML = `<div class="out">${acc
        .map(
            ([prefix, character, freq]) =>
                `<div>${prefix}</div><div>${character}</div><div>${(freq * 100).toFixed(2)}%</div>`
        )
        .join("")}</div>`;
}

function renderNode(acc: [string, string, number][], node: node, prefix: string): void {
    if ("value" in node) {
        acc.push([prefix, node.value == " " ? "_" : node.value, node.freq]);
        return;
    }

    renderNode(acc, node.left, prefix + "0");
    renderNode(acc, node.right, prefix + "1");
}
