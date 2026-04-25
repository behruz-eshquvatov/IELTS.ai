import useBodyScrollLock from "../../hooks/useBodyScrollLock";

function ConfirmLeaveModal({ isOpen, onCancel, onConfirm }) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-none border border-slate-200/80 bg-white/95 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">Leave workspace?</h3>
        <p className="mt-2 text-sm text-slate-600">
          Your session will end and you will return to the landing page.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-none border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-none border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
            onClick={onConfirm}
            type="button"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmLeaveModal;
