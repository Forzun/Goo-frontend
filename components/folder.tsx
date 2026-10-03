"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExpandingArrowButton } from "./local/motion/expanding-arrow-button";
import { motion } from "motion/react";

type MenuPos = { x: number; y: number } | null;

const MENU_ITEMS = ["Open", "Rename", "Properties" ,"Quit" ];

function BlueFolder() {
  return (
    <div className="relative h-[72px] w-[128px]" aria-hidden="true">
      <div className="absolute -top-[14px] left-0 h-[26px] w-[56px] rounded-t-[9px] bg-[#2f78c9]" />
      <div className="absolute inset-0 rounded-[10px] bg-gradient-to-b from-[#3f93e6] to-[#3585d8]" />
      <div className="absolute inset-x-0 bottom-0 top-[10px] rounded-[10px] bg-gradient-to-b from-[#6cc3fa] to-[#4fa8f0] shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-x-3 bottom-[6px] h-px rounded-full bg-white/25" />
      </div>
    </div>
  );
}

export default function Folder() {
  const [menu, setMenu] = useState<MenuPos>(null);
  const [isFocused, setIsFocused] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const folderRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setMenu(null), []);

  // close on outside click / Escape / scroll
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, close]);

  // Right click
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  // Long-press (touch / pen)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const { clientX: x, clientY: y } = e;
    pressTimer.current = setTimeout(() => setMenu({ x, y }), 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // Shift + F10 (keyboard)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.shiftKey && e.key === "F10") {
      e.preventDefault();
      const r = folderRef.current?.getBoundingClientRect();
      if (r) setMenu({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  };

  return (
    <main className="flex flex-col min-h-screen items-center justify-center ">
      <div className="flex flex-col items-center">
        <button
          ref={folderRef}
          type="button"
          onContextMenu={onContextMenu}
          onPointerDown={onPointerDown}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          onKeyDown={onKeyDown}
          className="rounded-xl px-4 py-2 outline-none [-webkit-touch-callout:none] select-none"
          aria-haspopup="menu"
          aria-label="Folder. Right click, long-press, or press Shift F10 for options"
        >
          <BlueFolder />
        </button>

        <div className="relative w-[128px]">
  <input
    ref={inputRef}
    className="text-[15px] text-center border-none font-semibold tracking-tight outline-none bg-transparent w-full h-[24px] relative z-10"
    placeholder=""
    onFocus={() => setIsFocused(true)}
    onBlur={() => setIsFocused(false)}
    style={{ caretColor: "#3585d8" }}
  />
  <motion.div
    className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
    animate={{ opacity: isFocused ? 0 : 1 }}
    transition={{ duration: 0.15 }}
  >
    <PopPlaceholder />
  </motion.div>
</div>

        <p className="mt-1 text-[12px] text-neutral-500">
          long-press · Shift + F10
        </p>
      </div>

      {menu && (
        <ul
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-44 rounded-lg border border-white/10 bg-[#232323]/95 p-1 text-sm shadow-xl backdrop-blur"
        >
          {MENU_ITEMS.map((item) => (
            <li key={item} role="none">
              <button
                role="menuitem"
                onClick={close}
                className="w-full rounded-md px-3 py-1.5 text-left text-neutral-200 hover:bg-[#3585d8] hover:text-white"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Start Button*/}
      <div className="p-6 mt-2 scale-90 ">
        <ExpandingArrowButton>Start</ExpandingArrowButton>
      </div>
    </main>
  );
}

function PopPlaceholder() {
  const fullPlaceholder = "Untitled";
  const [visibleChars, setVisibleChars] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    fullPlaceholder.split("").forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleChars((prev) => [...prev, i]);
      }, i * 100);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <span className="text-[15px] font-semibold tracking-tight select-none pointer-events-none text-neutral-400" aria-hidden="true">
      {fullPlaceholder.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={visibleChars.includes(i) ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
