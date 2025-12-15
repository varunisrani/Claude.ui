export const Z_INDEX = {
  modal: 50,
  modalHigh: 100,
  modalHighest: 200,
} as const;

export const modalBackdropClass =
  'fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4';
export const modalContainerClass =
  'bg-surface dark:bg-surface-dark rounded-xl w-full overflow-hidden max-h-[90vh] overflow-y-auto';

export const closeButtonClass =
  'p-1.5 sm:p-1 text-text-tertiary hover:text-text-secondary dark:hover:text-text-dark-primary rounded-lg transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center';
export const cancelButtonClass =
  'px-4 py-2 text-text-secondary dark:text-text-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary rounded-lg transition-colors min-h-[44px] sm:min-h-0';

export const modalSizes = {
  sm: 'max-w-[calc(100vw-1.5rem)] sm:max-w-sm',
  md: 'max-w-[calc(100vw-1.5rem)] sm:max-w-md',
  lg: 'max-w-[calc(100vw-1.5rem)] sm:max-w-lg',
  xl: 'max-w-[calc(100vw-1.5rem)] sm:max-w-xl',
  '2xl': 'max-w-[calc(100vw-1.5rem)] sm:max-w-2xl',
  '4xl': 'max-w-[calc(100vw-1.5rem)] sm:max-w-4xl',
  full: 'max-w-full',
} as const;
