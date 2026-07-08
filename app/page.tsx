"use client";
import { useEffect, useMemo, useState } from "react";

type Hist = { date: string; expr: string; result: string };
const keys = ["AC","(",")","÷","7","8","9","×","4","5","6","−","1","2","3","+","←","0",".","="];
const opMap: Record<string,string> = {"÷":"/","×":"*","−":"-"};
const STORAGE = "r-calc-history-v13";

function today(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}/${m}/${day}`;
}
function addCommas(num:string){
  if(!num) return num;
  const sign=num.startsWith("-")?"-":"";
  const clean=sign?num.slice(1):num;
  const [int,dec]=clean.split(".");
  const formatted=int.replace(/\B(?=(\d{3})+(?!\d))/g,",");
  return sign+formatted+(dec!==undefined?"."+dec:"");
}
function formatExpression(expr:string){
  return expr.replace(/\d+(?:\.\d*)?/g,(m)=>addCommas(m));
}
function normalize(expr:string){
  return expr.replace(/,/g,"").replace(/[÷×−]/g,(m)=>opMap[m] ?? m);
}
function safeEval(expr:string){
  const n=normalize(expr);
  if(!/^[0-9+\-*/().\s]+$/.test(n)) return null;
  try{
    // eslint-disable-next-line no-new-func
    const v=Function(`"use strict";return (${n})`)();
    if(typeof v!=="number"||!Number.isFinite(v)) return null;
    return Number.isInteger(v)?String(v):String(Number(v.toFixed(10))).replace(/\.0+$/,"");
  }catch{return null;}
}
function displaySize(text:string){
  const len=text.length;
  if(len>24) return "34px";
  if(len>18) return "42px";
  if(len>14) return "52px";
  if(len>10) return "62px";
  return "76px";
}

export default function Home(){
  const [expr,setExpr]=useState("");
  const [history,setHistory]=useState<Hist[]>([]);
  useEffect(()=>{try{const raw=localStorage.getItem(STORAGE); if(raw) setHistory(JSON.parse(raw));}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(history.slice(-80)));}catch{}},[history]);
  const current=expr?formatExpression(expr):"0";
  const recent=useMemo(()=>history.slice(-8),[history]);
  function press(k:string){
    if(k==="AC"){setExpr("");return;}
    if(k==="←"){setExpr(v=>v.slice(0,-1));return;}
    if(k==="="){
      if(!expr) return;
      const res=safeEval(expr);
      if(res===null) return;
      setHistory(h=>[...h,{date:today(),expr:formatExpression(expr),result:addCommas(res)}]);
      setExpr(res);
      return;
    }
    setExpr(v=>v+k);
  }
  return <main className="app"><section className="phone">
    <div className="display">
      <div className="date">{today()}</div>
      <div className="history">{recent.map((h,i)=><div className="history-line" key={i}>{h.expr}={h.result}</div>)}</div>
      <div className="current" style={{"--current-size":displaySize(current)} as React.CSSProperties}>{current}</div>
    </div>
    <div className="keypad">{keys.map(k=><button key={k} className={`key ${["÷","×","−","+","="].includes(k)?"op":(["AC","(",")"].includes(k)?"top":(k==="←"?"back":"num"))}`} onClick={()=>press(k)}>{k}</button>)}</div>
  </section></main>;
}
