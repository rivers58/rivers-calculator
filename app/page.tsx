'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type RecordItem = { date: string; expression: string; result: string };
const STORAGE_KEY = 'rivers-calculator-history-v1';

function todayLabel() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

function normalizeExpression(exp: string) {
  return exp.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/＋/g, '+');
}

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return 'Error';
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

function safeCalculate(expression: string) {
  const clean = normalizeExpression(expression).replace(/,/g, '');
  if (!clean || !/^[0-9+\-*/().\s]+$/.test(clean)) throw new Error('Invalid expression');
  // eslint-disable-next-line no-new-func
  const value = Function(`"use strict"; return (${clean});`)();
  if (typeof value !== 'number') throw new Error('Invalid result');
  return formatNumber(value);
}

export default function Home() {
  const [input, setInput] = useState('');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRecords(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [records, input]);

  const grouped = useMemo(() => {
    const map = new Map<string, RecordItem[]>();
    records.forEach((r) => map.set(r.date, [...(map.get(r.date) ?? []), r]));
    return Array.from(map.entries());
  }, [records]);

  const press = (key: string) => {
    if (key === 'C') { setInput(''); return; }
    if (key === '←') { setInput((v) => v.slice(0, -1)); return; }
    if (key === '=') {
      try {
        const result = safeCalculate(input);
        setRecords((prev) => [...prev, { date: todayLabel(), expression: input, result }]);
        setInput(result.replace(/,/g, ''));
      } catch {
        setInput('Error');
      }
      return;
    }
    setInput((v) => (v === 'Error' ? key : v + key));
  };

  const keys = ['C','(',')','←','÷','×','−','+','7','8','9','4','5','6','1','2','3','0','.','='];

  return (
    <main className="app">
      <section className="history">
        <div className="topbar"><span className="gear">⚙</span><span></span></div>
        {grouped.map(([date, items]) => (
          <div key={date}>
            <div className="date">{date}</div>
            {items.map((item, i) => <div className="line" key={`${date}-${i}`}>{item.expression}={item.result}</div>)}
          </div>
        ))}
        <div className="current">{input || '0'}</div>
        <div ref={bottomRef} />
      </section>
      <section className="keypad">
        {keys.map((k) => {
          const className = ['C','(',')','←'].includes(k) ? 'key util' : ['÷','×','−','+'].includes(k) ? 'key op' : k === '=' ? 'key equal' : k === '0' ? 'key zero' : 'key';
          return <button key={k} className={className} onClick={() => press(k)}>{k}</button>;
        })}
      </section>
    </main>
  );
}
