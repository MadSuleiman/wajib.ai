type ToastOptions = {
  description?: string;
};

type ToastMethod = "success" | "error" | "info";

const showToast = (
  method: ToastMethod,
  message: string,
  options?: ToastOptions,
) => {
  void import("sonner").then(({ toast }) => {
    toast[method](message, options);
  });
};

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    showToast("success", message, options),
  error: (message: string, options?: ToastOptions) =>
    showToast("error", message, options),
  info: (message: string, options?: ToastOptions) =>
    showToast("info", message, options),
};
