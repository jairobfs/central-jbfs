'use client';

import {useEffect,useRef} from 'react';
import type {CSSProperties} from 'react';

// Stable positions avoid hydration jumps and keep the decorative field lightweight.
const motes=Array.from({length:27},(_,index)=>({
  x:7+(index*37%89),
  y:9+(index*53%79),
  size:2+(index*7%4),
  duration:5+(index*11%8),
  delay:-(index*13%12),
  shade:index%4===0?'gold':index%3===0?'mint':'teal',
}));

export default function MotionField(){
  const field=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const layer=field.current;
    const host=layer?.closest<HTMLElement>('.welcome');
    if(!layer||!host)return;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame=0;
    let targetX=0;
    let targetY=0;
    const enabled=()=>document.documentElement.dataset.motion!=='off'&&!reduce.matches;
    const paint=()=>{
      frame=0;
      host.style.setProperty('--hero-shift-x',`${(targetX*13).toFixed(1)}px`);
      host.style.setProperty('--hero-shift-y',`${(targetY*10).toFixed(1)}px`);
      host.style.setProperty('--hero-glow-x',`${(50+targetX*25).toFixed(1)}%`);
      host.style.setProperty('--hero-glow-y',`${(50+targetY*25).toFixed(1)}%`);
    };
    const move=(event:PointerEvent)=>{
      if(!enabled()||!fine.matches)return;
      const bounds=host.getBoundingClientRect();
      targetX=Math.max(-1,Math.min(1,((event.clientX-bounds.left)/bounds.width-.5)*2));
      targetY=Math.max(-1,Math.min(1,((event.clientY-bounds.top)/bounds.height-.5)*2));
      if(!frame)frame=requestAnimationFrame(paint);
    };
    const leave=()=>{
      targetX=targetY=0;
      if(!frame)frame=requestAnimationFrame(paint);
    };
    const burst=(event:PointerEvent)=>{
      if(!enabled())return;
      const bounds=host.getBoundingClientRect();
      const x=event.clientX-bounds.left;
      const y=event.clientY-bounds.top;
      for(let index=0;index<7;index++){
        const spark=document.createElement('span');
        const angle=index*Math.PI*2/7;
        spark.className='hero-touch-spark';
        spark.style.left=`${x}px`;
        spark.style.top=`${y}px`;
        spark.style.setProperty('--spark-x',`${Math.cos(angle)*(26+index%3*10)}px`);
        spark.style.setProperty('--spark-y',`${Math.sin(angle)*(26+index%3*10)}px`);
        layer.appendChild(spark);
        window.setTimeout(()=>spark.remove(),950);
      }
    };
    host.addEventListener('pointermove',move,{passive:true});
    host.addEventListener('pointerleave',leave,{passive:true});
    host.addEventListener('pointerdown',burst,{passive:true});
    return()=>{
      host.removeEventListener('pointermove',move);
      host.removeEventListener('pointerleave',leave);
      host.removeEventListener('pointerdown',burst);
      if(frame)cancelAnimationFrame(frame);
      host.style.removeProperty('--hero-shift-x');
      host.style.removeProperty('--hero-shift-y');
      host.style.removeProperty('--hero-glow-x');
      host.style.removeProperty('--hero-glow-y');
    };
  },[]);

  return <div className="hero-motion-field" ref={field} aria-hidden="true">
    <div className="hero-glow hero-glow-a"/>
    <div className="hero-glow hero-glow-b"/>
    <div className="hero-wave hero-wave-one"/>
    <div className="hero-wave hero-wave-two"/>
    <div className="hero-streak hero-streak-one"/>
    <div className="hero-streak hero-streak-two"/>
    {motes.map((mote,index)=><i key={index} className={`hero-mote hero-mote-${mote.shade}`} style={{'--mote-x':`${mote.x}%`,'--mote-y':`${mote.y}%`,'--mote-size':`${mote.size}px`,'--mote-duration':`${mote.duration}s`,'--mote-delay':`${mote.delay}s`} as CSSProperties}/>)}
  </div>;
}
