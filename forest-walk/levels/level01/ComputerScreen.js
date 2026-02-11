// ========================================
// COMPUTER SCREEN — HTML overlay code editor
// ========================================

const CODE_SNIPPETS = [
  `import pandas as pd`,
  `import numpy as np`,
  `from datetime import datetime`,
  ``,
  `# Load Q3 financial data`,
  `df = pd.read_csv("transactions_q3.csv")`,
  `df["date"] = pd.to_datetime(df["date"])`,
  ``,
  `# Filter for JPMorgan accounts`,
  `jpm = df[df["entity"] == "JPMORGAN"]`,
  `print(f"Total transactions: {len(jpm)}")`,
  ``,
  `# Calculate daily volumes`,
  `daily = jpm.groupby(jpm["date"].dt.date).agg({`,
  `    "amount": ["sum", "mean", "count"],`,
  `    "fee": "sum"`,
  `})`,
  ``,
  `# Risk assessment metrics`,
  `volatility = daily["amount"]["sum"].std()`,
  `avg_volume = daily["amount"]["sum"].mean()`,
  `print(f"Volatility: {volatility:.2f}")`,
  `print(f"Avg Volume: \${avg_volume:,.2f}")`,
  ``,
  `# Generate compliance report`,
  `def check_compliance(row):`,
  `    if row["amount"] > 1000000:`,
  `        return "REVIEW_REQUIRED"`,
  `    return "PASSED"`,
  ``,
  `jpm["compliance"] = jpm.apply(check_compliance, axis=1)`,
  `flagged = jpm[jpm["compliance"] == "REVIEW_REQUIRED"]`,
  `print(f"Flagged: {len(flagged)} transactions")`,
];

export class ComputerScreen {
  constructor() {
    this.overlay = document.getElementById("computer-screen-overlay");
    this.codeText = document.getElementById("code-text");
    this.lineNumbers = document.getElementById("line-numbers");
    this.typingInterval = null;
    this.currentLine = 0;
    this.currentChar = 0;
    this.lines = [];
  }

  show() {
    if (!this.overlay) return;
    this.overlay.classList.remove("hidden");
    this.lines = [];
    this.currentLine = 0;
    this.currentChar = 0;
    this._updateDisplay();
    this._startTyping();
  }

  hide() {
    if (!this.overlay) return;
    this.overlay.classList.add("hidden");
    this._stopTyping();
  }

  _startTyping() {
    this._stopTyping();
    this.typingInterval = setInterval(() => {
      if (this.currentLine >= CODE_SNIPPETS.length) {
        this.currentLine = 0;
        this.currentChar = 0;
        this.lines = [];
      }

      const line = CODE_SNIPPETS[this.currentLine];
      if (this.currentChar <= line.length) {
        // Update current line being typed
        const displayLines = [...this.lines, line.substring(0, this.currentChar)];
        this._render(displayLines);
        this.currentChar++;
      } else {
        // Line complete, move to next
        this.lines.push(line);
        this.currentLine++;
        this.currentChar = 0;
      }
    }, 40);
  }

  _stopTyping() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  }

  _render(lines) {
    if (!this.codeText || !this.lineNumbers) return;

    // Syntax highlight
    this.codeText.innerHTML = lines.map(line => this._highlight(line)).join("\n");

    // Line numbers
    this.lineNumbers.innerHTML = lines
      .map((_, i) => `<span>${i + 1}</span>`)
      .join("\n");

    // Auto-scroll to bottom
    const editor = this.codeText.parentElement;
    if (editor) editor.scrollTop = editor.scrollHeight;
  }

  _highlight(line) {
    // Basic Python syntax highlighting
    return line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Strings
      .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="hl-string">$&</span>')
      // Comments
      .replace(/(#.*)$/gm, '<span class="hl-comment">$1</span>')
      // Keywords
      .replace(/\b(import|from|def|if|return|for|in|as|print|class|and|or|not)\b/g,
        '<span class="hl-keyword">$1</span>')
      // Built-ins
      .replace(/\b(len|sum|mean|std|apply|groupby|agg|read_csv)\b/g,
        '<span class="hl-builtin">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
  }

  _updateDisplay() {
    this._render([]);
  }

  dispose() {
    this._stopTyping();
    this.hide();
  }
}
