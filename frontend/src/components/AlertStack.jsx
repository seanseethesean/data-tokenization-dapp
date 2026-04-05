export default function AlertStack({ alerts, onDismiss }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${
            alert.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : alert.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <div>
            <p className="font-medium">{alert.title}</p>
            <p className="mt-0.5 break-all text-xs opacity-90">{alert.message}</p>
          </div>
          <button
            type="button"
            className="ml-3 text-xs font-semibold uppercase tracking-wide"
            onClick={() => onDismiss(alert.id)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
