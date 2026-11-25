import { useContext } from "react";
import { ToastContext } from "../context/toastContextDef.js";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { addToast: () => {}, removeToast: () => {} };
  }
  return context;
}
