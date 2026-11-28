"use client";

import { useRef, useState, type RefObject } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

const CATEGORIES: { name: string; emoji: string[] }[] = [
  {
    name: "Wedding & Love",
    emoji: ["❤️", "💖", "💍", "👰", "🤵", "💐", "🕊️", "🥂", "💑", "🌹", "🌺", "🪷"],
  },
  {
    name: "Festive & Lights",
    emoji: ["🪔", "🕉️", "✨", "🎆", "🎇", "🎊", "🎉", "🏮", "🔥", "⭐", "🌟", "👑"],
  },
  {
    name: "Music & Dance",
    emoji: ["💃", "🕺", "🥁", "🎶", "🎵", "🎺", "🥳", "👏", "🙌", "🦚", "🦋"],
  },
  {
    name: "Symbols & Arrows",
    emoji: ["➡️", "⬅️", "⚡", "☀️", "🌙", "🌈", "💎", "🏆", "🚩", "🙏"],
  },
];

const PRESETS = ["🙏 स्वागतम 🙏", "💖 शुभ विवाह 💖", "🪔 शुभ दीपावली 🪔", "🎉 जय श्री राम 🚩"];

/** Appends at the text caret so Hindi text and emoji can be mixed in place. */
export default function EmojiPicker({ value, onChange, inputRef }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(0);
  const localRef = useRef<HTMLInputElement | null>(null);
  const target = inputRef ?? localRef;

  const insert = (text: string) => {
    const el = target.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={`btn h-9 min-h-[44px] px-2.5 md:h-9 md:min-h-0 ${open ? "chip-active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Insert colour emoji at the cursor"
      >
        😊 Emojis
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#111827] p-2.5 shadow-xl">
          <div className="mb-2 flex flex-wrap gap-1">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                type="button"
                className={`chip min-h-[32px] ${category === i ? "chip-active" : ""}`}
                onClick={() => setCategory(i)}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="grid max-h-44 grid-cols-6 gap-1 overflow-y-auto scroll-pb-2">
            {CATEGORIES[category].emoji.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="grid min-h-[44px] place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-[20px] hover:border-teal-400/50 md:min-h-[36px]"
                onClick={() => insert(emoji)}
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="label mb-1.5">1-tap festive presets</div>
            <div className="grid gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="min-h-[40px] rounded-lg border border-white/10 bg-white/[0.03] px-2 text-left text-[12px] hover:border-teal-400/50"
                  onClick={() => insert(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
