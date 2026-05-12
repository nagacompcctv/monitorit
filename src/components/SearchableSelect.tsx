import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Pilih...", 
  disabled = false,
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium flex items-center justify-between cursor-pointer transition-all",
          isOpen && "border-blue-500 bg-white shadow-lg shadow-blue-500/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className={cn("truncate uppercase", !selectedOption && "text-gray-400")}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-[60] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input 
                autoFocus
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-gray-400 uppercase"
              />
              {search && (
                <button onClick={() => setSearch("")} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-xs font-medium uppercase flex items-center justify-between transition-colors",
                      value === opt.id ? "bg-blue-600 text-white" : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    {opt.name}
                    {value === opt.id && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[10px] font-bold text-gray-300 uppercase">Tidak ditemukan</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
