// WinGo 1M Analyzer
// Public-history statistical analyzer.
// This is NOT a guaranteed predictor.

const API_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

let history = [];

const $ = (id) => document.getElementById(id);

async function loadHistory() {
  const status = $("status");

  status.textContent = "Loading public history...";

  try {
    const response = await fetch(API_URL + "?ts=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("API HTTP " + response.status);
    }

    const json = await response.json();

    history = extractHistory(json);

    if (!history.length) {
      throw new Error("No usable history data");
    }

    status.textContent =
      "Live public history loaded: " + history.length + " records";

    analyze();

  } catch (error) {
    console.log("API error:", error);

    status.textContent =
      "Live API unavailable in browser. Using demo data.";

    history = createDemoData();

    analyze();
  }
}


// Try to extract number values from different response formats
function extractHistory(json) {
  let rows = [];

  if (Array.isArray(json)) {
    rows = json;
  } else if (Array.isArray(json?.data)) {
    rows = json.data;
  } else if (Array.isArray(json?.data?.list)) {
    rows = json.data.list;
  } else if (Array.isArray(json?.data?.records)) {
    rows = json.data.records;
  } else if (Array.isArray(json?.result)) {
    rows = json.result;
  }

  return rows
    .map((item) => {
      const number =
        item?.number ??
        item?.result ??
        item?.num ??
        item?.openNumber ??
        item?.openCode;

      const issue =
        item?.issueNumber ??
        item?.issue ??
        item?.period ??
        item?.issueNo ??
        "";

      const n = parseInt(number, 10);

      if (Number.isNaN(n) || n < 0 || n > 9) {
        return null;
      }

      return {
        issue: String(issue),
        number: n
      };
    })
    .filter(Boolean);
}


// Demo data only if the public API cannot be read
function createDemoData() {
  const arr = [];

  for (let i = 0; i < 100; i++) {
    arr.push({
      issue: "DEMO-" + (100 - i),
      number: Math.floor(Math.random() * 10)
    });
  }

  return arr;
}


// Main statistical analysis
function analyze() {
  if (!history.length) return;

  const numbers = history.map(x => x.number);

  const bigCount = numbers.filter(n => n >= 5).length;
  const smallCount = numbers.filter(n => n <= 4).length;

  const bigPercent = (bigCount / numbers.length) * 100;
  const smallPercent = (smallCount / numbers.length) * 100;

  // Recent 10
  const recent = numbers.slice(0, 10);

  const recentBig =
    recent.filter(n => n >= 5).length;

  const recentSmall =
    recent.filter(n => n <= 4).length;

  // Frequency
  const frequency = Array(10).fill(0);

  numbers.forEach(n => {
    frequency[n]++;
  });

  // Markov transition
  let ss = 0;
  let sb = 0;
  let bs = 0;
  let bb = 0;

  for (let i = 0; i < numbers.length - 1; i++) {
    const currentBig = numbers[i] >= 5;
    const nextBig = numbers[i + 1] >= 5;

    if (!currentBig && !nextBig) ss++;
    if (!currentBig && nextBig) sb++;
    if (currentBig && !nextBig) bs++;
    if (currentBig && nextBig) bb++;
  }

  // Current result
  const current = numbers[0];
  const currentIsBig = current >= 5;

  let transitionBig = 50;

  if (currentIsBig) {
    const total = bs + bb;

    if (total > 0) {
      transitionBig = (bb / total) * 100;
    }
  } else {
    const total = ss + sb;

    if (total > 0) {
      transitionBig = (sb / total) * 100;
    }
  }

  // Recent momentum
  const momentumBig =
    (recentBig / Math.max(recent.length, 1)) * 100;

  // Frequency probability
  const frequencyBig =
    (bigCount / numbers.length) * 100;

  // Combined statistical score
  const score =
    (frequencyBig * 0.40) +
    (transitionBig * 0.35) +
    (momentumBig * 0.25);

  const prediction =
    score >= 50 ? "BIG" : "SMALL";

  const confidence =
    Math.abs(score - 50) * 2;

  render(
    current,
    prediction,
    Math.min(confidence, 99),
    bigPercent,
    smallPercent,
    transitionBig,
    momentumBig,
    frequency
  );
}


// Render results
function render(
  current,
  prediction,
  confidence,
  bigPercent,
  smallPercent,
  transitionBig,
  momentumBig,
  frequency
) {
  $("currentNumber").textContent = current;

  $("prediction").textContent = prediction;

  $("confidence").textContent =
    confidence.toFixed(1) + "%";

  $("bigPercent").textContent =
    bigPercent.toFixed(1) + "%";

  $("smallPercent").textContent =
    smallPercent.toFixed(1) + "%";

  $("transition").textContent =
    transitionBig.toFixed(1) + "%";

  $("momentum").textContent =
    momentumBig.toFixed(1) + "%";

  // Frequency table
  const table = $("frequencyTable");

  if (table) {
    table.innerHTML = "";

    frequency.forEach((count, number) => {
      const row = document.createElement("div");

      row.className = "frequency-row";

      row.innerHTML = `
        <span>${number}</span>
        <span>${count}</span>
      `;

      table.appendChild(row);
    });
  }

  // History
  const historyBox = $("history");

  if (historyBox) {
    historyBox.innerHTML = "";

    history.slice(0, 30).forEach(item => {
      const badge = document.createElement("div");

      badge.className =
        "history-item " +
        (item.number >= 5 ? "big" : "small");

      badge.innerHTML = `
        <strong>${item.number}</strong>
        <small>${item.issue}</small>
      `;

      historyBox.appendChild(badge);
    });
  }
}


// Manual refresh
function refreshData() {
  loadHistory();
}


// Auto refresh every 30 seconds
setInterval(() => {
  loadHistory();
}, 30000);


// Start
document.addEventListener("DOMContentLoaded", () => {

  const refreshButton = $("refresh");

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      refreshData
    );
  }

  loadHistory();
});
