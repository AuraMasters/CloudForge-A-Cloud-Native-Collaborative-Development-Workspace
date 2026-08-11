// @refresh reset
import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type AlertType = "error" | "success";

interface Alert {
  type: AlertType;
  message: string;
}

export interface AlertContextType {
  alert: Alert | null;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  closeAlert: () => void;
}

export const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider = ({ children }: AlertProviderProps) => {
  const [alert, setAlert] = useState<Alert | null>(null);

  const showAlert = useCallback((type: AlertType, message: string) => {
    setAlert({ type, message });

    setTimeout(() => {
      setAlert((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  const showError = useCallback(
    (message: string) => {
      showAlert("error", message);
    },
    [showAlert]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showAlert("success", message);
    },
    [showAlert]
  );

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ alert, showError, showSuccess, closeAlert }}>
      <style>
        {`
          @keyframes alertProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}
      </style>

      {children}

      {alert && (
        <div className="fixed top-5 right-5 z-50 w-[380px] animate-in fade-in slide-in-from-top-5">
          <div
            className={`relative overflow-hidden rounded-xl border p-4 shadow-lg bg-white ${
              alert.type === "error"
                ? "border-red-200 text-red-800"
                : "border-emerald-200 text-emerald-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className={`text-sm font-bold ${
                  alert.type === "error" ? "text-red-700" : "text-emerald-700"
                }`}>
                  {alert.type === "error" ? "Error" : "Success"}
                </p>

                <p className="mt-1 text-sm font-medium opacity-90">
                  {alert.message}
                </p>
              </div>

              <button
                onClick={closeAlert}
                className="text-xl leading-none opacity-50 transition hover:opacity-100 focus:outline-none"
              >
                ×
              </button>
            </div>

            <div
              key={alert.message} 
              className={`absolute bottom-0 left-0 h-1 ${
                alert.type === "error" ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{
                animation: "alertProgress 5s linear forwards",
              }}
            />
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};