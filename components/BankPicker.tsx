"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Check, Landmark, ChevronRight } from "lucide-react";
import { MALAYSIAN_BANKS, Bank } from "@/lib/banks";

interface BankPickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
}

export default function BankPicker({ value, onChange, label, disabled }: BankPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selectedBank = useMemo(() =>
        MALAYSIAN_BANKS.find(b => b.name === value || b.id === value),
        [value]);

    const filteredBanks = useMemo(() => {
        if (!search) return MALAYSIAN_BANKS;
        return MALAYSIAN_BANKS.filter(b =>
            b.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Prevent scroll when modal open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setSearch(""); // Reset search on close
        }
    }, [isOpen]);

    return (
        <div className="space-y-2">
            {label && <label className="text-xs font-medium text-gray-400">{label}</label>}

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className={`w-full flex items-center justify-between bg-black/50 border border-white/10 rounded-lg p-3 text-left transition-all hover:bg-white/5 focus:border-primary outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {selectedBank ? (
                        <>
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white shrink-0 shadow-inner"
                            >
                                {selectedBank.domain ? (
                                    <img
                                        src={`https://www.google.com/s2/favicons?domain=${selectedBank.domain}&sz=128`}
                                        alt={selectedBank.name}
                                        className="w-full h-full object-contain p-1"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const parent = target.parentElement!;
                                            parent.style.backgroundColor = selectedBank.color;
                                            parent.innerHTML = `<span class="text-[10px] font-bold text-white">${selectedBank.name.substring(0, 2)}</span>`;
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: selectedBank.color }}>
                                        <span className="text-[10px] font-bold text-white">{selectedBank.name.substring(0, 2)}</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-white text-sm font-medium">{selectedBank.name}</span>
                        </>
                    ) : (
                        <>
                            <Landmark className="w-5 h-5 text-gray-600" />
                            <span className="text-gray-500 text-sm">Pilih Bank</span>
                        </>
                    )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm transition-all animate-in fade-in">
                    <div
                        className="bg-surface w-full max-w-lg rounded-t-2xl md:rounded-2xl border-x border-t md:border border-white/10 flex flex-col max-h-[90vh] md:max-h-[600px] shadow-2xl animate-in slide-in-from-bottom"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Pilih Bank</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    autoFocus
                                    placeholder="Cari nama bank..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-primary/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-white/5">
                            <div className="grid grid-cols-1 gap-1">
                                {filteredBanks.length > 0 ? (
                                    filteredBanks.map((bank) => (
                                        <button
                                            key={bank.id}
                                            onClick={() => {
                                                onChange(bank.name);
                                                setIsOpen(false);
                                            }}
                                            className={`flex items-center justify-between p-3 rounded-xl transition-all ${(value === bank.name || value === bank.id)
                                                ? 'bg-primary text-black'
                                                : 'text-gray-300 hover:bg-white/5 active:scale-[0.98]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform group-active:scale-95 ${(value === bank.name || value === bank.id) ? 'bg-white' : 'bg-white'
                                                        }`}
                                                >
                                                    {bank.domain ? (
                                                        <img
                                                            src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=128`}
                                                            alt={bank.name}
                                                            className="w-full h-full object-contain p-1.5"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                const parent = target.parentElement!;
                                                                parent.style.backgroundColor = bank.color;
                                                                parent.innerHTML = `<span class="text-xs font-bold text-white">${bank.name.substring(0, 2)}</span>`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bank.color }}>
                                                            <span className="text-xs font-bold text-white">{bank.name.substring(0, 2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold">{bank.name}</span>
                                            </div>
                                            {(value === bank.name || value === bank.id) && <Check className="w-5 h-5" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-gray-500 flex flex-col items-center gap-3">
                                        <Landmark className="w-10 h-10 opacity-20" />
                                        <p>Tiada bank dijumpai.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Spacer for Mobile */}
                        <div className="h-4 md:hidden" />
                    </div>
                    {/* Backdrop catch-click */}
                    <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}
