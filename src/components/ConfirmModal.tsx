import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
      bg: "bg-red-50"
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
      bg: "bg-amber-50"
    },
    info: {
      icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
      button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
      bg: "bg-blue-50"
    }
  };

  const style = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${style.bg}`}>
                  {style.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <button 
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-2 text-gray-600 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-6 py-2 text-sm font-bold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${style.button}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
