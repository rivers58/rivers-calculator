"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Hist = {
  date: string;
  expr: string;
  result: string;
};

type GroupedHist = {
  date: string;
  items: Hist[];
};

const keys = [
  "C", "÷", "×", "←",
  "7", "8", "9", "−",
  "4", "5", "6", "+",
  "1", "2", "3", ".",
  "(", ")", "0", "=",
];

const opMap: Record<string, string> = {
  "÷": "/",
  "×": "*",
  "−": "-",
};

const binaryOperators = new Set(["÷", "×", "−", "+"]);
const STORAGE = "r-calc-history-v13";

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function addCommas(num: string) {
  if (!num) return num;

  const sign = num.startsWith("-") ? "-" : "";
  const clean = sign ? num.slice(1) : num;
  const [int, dec] = clean.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return sign + formatted + (dec !== undefined ? "." + dec : "");
}

function formatExpression(expr: string) {
  return expr.replace(/\d+(?:\.\d*)?/g, (value) => addCommas(value));
}

function normalize(expr: string) {
  return expr
    .replace(/,/g, "")
    .replace(/[÷×−]/g, (value) => opMap[value] ?? value);
}

function safeEval(expr: string) {
  const normalized = normalize(expr);

  if (!/^[0-9+\-*/().\s]+$/.test(normalized)) return null;

  try {
    // eslint-disable-next-line no-new-func
    const value = Function(`"use strict";return (${normalized})`)();

    if (typeof value !== "number" || !Number.isFinite(value)) return null;

    return Number.isInteger(value)
      ? String(value)
      : String(Number(value.toFixed(10))).replace(/\.0+$/, "");
  } catch {
    return null;
  }
}

function displaySize(text: string) {
  const len = text.length;

  if (len > 52) return "20px";
  if (len > 44) return "22px";
  if (len > 36) return "24px";
  if (len > 30) return "28px";
  if (len > 24) return "32px";
  if (len > 18) return "38px";
  if (len > 14) return "44px";
  if (len > 10) return "50px";

  return "58px";
}

function groupHistory(records: Hist[]): GroupedHist[] {
  const map = new Map<string, Hist[]>();

  for (const item of records) {
    const key = item.date || today();

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    items,
  }));
}

export default function Home() {
  const [expr, setExpr] = useState("");
  const [history, setHistory] = useState<Hist[]>([]);
  const [justEvaluated, setJustEvaluated] = useState(false);
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // Ignore unavailable or invalid local storage.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(history.slice(-160)));
    } catch {
      // Ignore unavailable local storage.
    }
  }, [history]);

  const current = expr ? formatExpression(expr) : "0";
  const groupedHistory = useMemo(
    () => groupHistory(history).slice(-7),
    [history],
  );

  useEffect(() => {
    const element = historyRef.current;
    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
  }, [groupedHistory]);

  function press(key: string) {
    if (key === "C") {
      setExpr("");
      setJustEvaluated(false);
      return;
    }

    if (key === "←") {
      setExpr((value) => (justEvaluated ? "" : value.slice(0, -1)));
      setJustEvaluated(false);
      return;
    }

    if (key === "=") {
      if (!expr) return;

      const result = safeEval(expr);
      if (result === null) return;

      setHistory((items) => [
        ...items,
        {
          date: today(),
          expr: formatExpression(expr),
          result: addCommas(result),
        },
      ]);
      setExpr(result);
      setJustEvaluated(true);
      return;
    }

    if (justEvaluated) {
      if (binaryOperators.has(key)) {
        // 計算完成後直接按運算符號：沿用前次答案繼續計算。
        setExpr((value) => value + key);
      } else {
        // 計算完成後按數字、小數點或括號：清除前次答案並開始新算式。
        setExpr(key);
      }

      setJustEvaluated(false);
      return;
    }

    setExpr((value) => value + key);
  }

  return (
    <main className="app">
      <section className="phone">
        <div className="display">
          <div className="history" ref={historyRef}>
            {groupedHistory.length === 0 ? (
              <div className="history-group">
                <div className="history-date">{today()}</div>
              </div>
            ) : (
              groupedHistory.map((group) => (
                <div className="history-group" key={group.date}>
                  <div className="history-date">{group.date}</div>
                  {group.items.map((item, index) => (
                    <div
                      className="history-line"
                      key={`${group.date}-${index}-${item.expr}`}
                    >
                      {`${item.expr}=${item.result}`}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div
            className="current"
            style={
              {
                "--current-size": displaySize(current),
              } as React.CSSProperties
            }
          >
            {current}
          </div>
        </div>

        <div className="keypad">
          {keys.map((key) => {
            const classNames = [
              "key",
              binaryOperators.has(key) || key === "=" ? "op" : "",
              /^\d$/.test(key) || key === "." ? "num" : "",
              key === "←" ? "back" : "",
              ["C", "(", ")"].includes(key) ? "top" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                type="button"
                className={classNames}
                key={key}
                onClick={() => press(key)}
                aria-label={key}
              >
                {key}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
