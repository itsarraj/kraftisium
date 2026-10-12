import { toast, type ToastOptions } from 'react-hot-toast'

const brandBackground = '#1a1a1a'
const brandSurface = '#2b2b2b'
const brandAccent = '#fcc636'
const brandText = '#f5f5f5'
const dangerAccent = '#f87272'

export const brandToastStyle: ToastOptions['style'] = {
  background: brandBackground,
  color: brandText,
  border: '1px solid rgba(252, 198, 54, 0.25)',
  borderRadius: '12px',
  boxShadow: '2px 2px 0px 0 rgba(0,0,0,0.5)',
}

function mergeOptions(options?: ToastOptions): ToastOptions {
  return {
    duration: 4000,
    ...options,
    style: {
      ...brandToastStyle,
      ...options?.style,
    },
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function notify(message: string, options?: ToastOptions) {
  return toast(message, mergeOptions(options))
}

export function notifySuccess(message: string, options?: ToastOptions) {
  return toast.success(message, {
    ...mergeOptions(options),
    duration: 4500,
    iconTheme: {
      primary: brandAccent,
      secondary: brandSurface,
      ...options?.iconTheme,
    },
    style: {
      ...brandToastStyle,
      border: '1px solid rgba(252, 198, 54, 0.45)',
      ...options?.style,
    },
  })
}

export function notifyError(message: string, options?: ToastOptions) {
  return toast.error(message, {
    ...mergeOptions(options),
    duration: 5000,
    iconTheme: {
      primary: dangerAccent,
      secondary: brandSurface,
      ...options?.iconTheme,
    },
    style: {
      ...brandToastStyle,
      border: '1px solid rgba(248, 114, 114, 0.4)',
      ...options?.style,
    },
  })
}
