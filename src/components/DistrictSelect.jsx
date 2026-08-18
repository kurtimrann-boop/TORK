"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TURKEY_DISTRICTS } from "../data/turkeyDistricts";

export default function DistrictSelect({
  label,
  value,
  onChange,
  provinceCode,
  placeholder = "İlçe seçiniz...",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const listboxId = useId();

  const districts = useMemo(() => {
    if (!provinceCode) return [];
    const province = TURKEY_DISTRICTS.find(
      (p) => p.code === provinceCode
    );
    return province ? province.d : [];
  }, [provinceCode]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return districts;
    const q = searchQuery.toLowerCase();
    return districts.filter((d) => d.toLowerCase().includes(q));
  }, [searchQuery, districts]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  function handleKeyDown(e) {
    if (!isOpen && e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : filtered.length - 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filtered.length
      ) {
        selectDistrict(filtered[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    }
  }

  function selectDistrict(district) {
    onChange(district);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  }

  function clearSelection() {
    onChange(null);
    setSearchQuery("");
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  const displayValue =
    typeof value === "string" ? value : value?.name || "";

  return (
    <div ref={containerRef} className="relative">
      <label className="tork-eyebrow mb-2 block">{label}</label>

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          disabled={disabled || !provinceCode}
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            provinceCode ? placeholder : "Önce il seçiniz"
          }
          className="tork-input flex-1 px-4 py-3.5 pr-10 text-sm"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen && provinceCode ? listboxId : undefined}
        />

        {displayValue && !isOpen && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 flex h-5 w-5 items-center justify-center rounded text-[#9AA7B5] transition-colors hover:text-[#F5F7FA]"
            aria-label="Seçimi temizle"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && provinceCode && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#00E5A0]/20 bg-[#0B111A] shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#667085]">
              Sonuç bulunamadı
            </div>
          ) : (
            <ul>
              {filtered.map((district, index) => (
                <li
                  key={district}
                  role="option"
                  aria-selected={value === district}
                >
                  <button
                    type="button"
                    onClick={() => selectDistrict(district)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      highlightedIndex === index
                        ? "bg-[#00E5A0]/10 text-[#00E5A0]"
                        : value === district
                          ? "bg-[#00E5A0]/5 text-[#00E5A0]"
                          : "text-[#F5F7FA] hover:bg-white/[0.03]"
                    }`}
                  >
                    {district}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
