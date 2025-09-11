// No-op toast system - all notifications disabled
const Toaster = () => null

// No-op toast function - does nothing
const toast = {
  success: (...args: any[]) => {},
  error: (...args: any[]) => {},
  warning: (...args: any[]) => {},
  info: (...args: any[]) => {},
  message: (...args: any[]) => {},
  promise: (...args: any[]) => {},
  custom: (...args: any[]) => {},
  dismiss: (...args: any[]) => {},
  loading: (...args: any[]) => {},
}

export { Toaster, toast }
