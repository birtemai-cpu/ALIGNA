import React from 'react';
import { ShieldAlert, RotateCcw, Trash2, FileText, X } from 'lucide-react';

interface SafetyExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEndAndClear: () => void;
  onRestartGently: () => void;
  onReviewConversation?: () => void;
  canReview?: boolean;
}

export const SafetyExitModal: React.FC<SafetyExitModalProps> = ({
  isOpen,
  onClose,
  onEndAndClear,
  onRestartGently,
  onReviewConversation,
  canReview = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="safety-exit-modal"
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 leading-snug">
          We can stop here. You do not need to continue.
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
          Practice is paused and audio capture has stopped. You are always in control of this session. Choose how you would like to proceed:
        </p>

        <div className="mt-6 space-y-2.5">
          <button
            id="safety-restart-gently-btn"
            onClick={onRestartGently}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <span>Restart gently</span>
          </button>

          {canReview && onReviewConversation && (
            <button
              id="safety-review-btn"
              onClick={onReviewConversation}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Review conversation so far</span>
            </button>
          )}

          <button
            id="safety-end-clear-btn"
            onClick={onEndAndClear}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>End session and clear data</span>
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700 py-2"
          >
            Resume current conversation
          </button>
        </div>
      </div>
    </div>
  );
};
