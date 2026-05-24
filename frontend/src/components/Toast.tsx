export type ToastTone = "success" | "error";

export type ToastState = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastProps = {
  toast: ToastState;
  onClose: () => void;
};

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div className="toast-region">
      <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
        <span>{toast.message}</span>
        <button type="button" onClick={onClose} aria-label="알림 닫기">
          ×
        </button>
      </div>
    </div>
  );
}
