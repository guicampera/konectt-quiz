
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';

interface PopupProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
    themeColor?: string;
    textColor?: string;
}

export const Popup: React.FC<PopupProps> = ({ isOpen, message, onClose, themeColor = '#6366f1', textColor = '#ffffff' }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
                        style={{ color: textColor }}
                    >
                        {/* Decorative Glow */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full opacity-20 pointer-events-none" style={{ backgroundColor: themeColor }} />

                        <div className="flex flex-col items-center text-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                <AlertCircle className="w-6 h-6" style={{ color: themeColor }} />
                            </div>

                            <h3 className="text-lg font-bold">Atenção</h3>
                            <p className="opacity-80 text-sm leading-relaxed">{message}</p>

                            <button
                                onClick={onClose}
                                className="mt-2 w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: themeColor, color: '#ffffff' }}
                            >
                                Entendi
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 opacity-50 hover:opacity-100 p-2 z-20 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
