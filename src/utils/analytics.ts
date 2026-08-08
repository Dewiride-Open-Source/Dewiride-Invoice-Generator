/**
 * Google Analytics event helpers.
 *
 * The gtag queue is installed inline in _document (GA_INIT_SCRIPT below) and
 * the gtag.js library is loaded lazily, on browser idle. That split matters:
 * gtag() pushes onto window.dataLayer, and the library drains whatever is
 * queued once it arrives, so deferring the 166 KB download costs no events.
 */

export const GA_MEASUREMENT_ID = 'G-N6400HZG5L';

/**
 * Installs window.dataLayer and the gtag shim before anything renders. ~150
 * bytes inline, versus putting the whole library on the critical path -- which
 * measured as the single largest drag on this page (LCP 5.8s -> 2.9s and
 * Lighthouse performance 78 -> 95 with GA blocked entirely).
 */
export const GA_INIT_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${'G-N6400HZG5L'}');`;

// Declare gtag function for TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
  }
}

// Track when a user generates an invoice
export const trackInvoiceGenerated = (currency: string, itemCount: number, totalAmount: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'invoice_generated', {
      event_category: 'Invoice',
      event_label: currency,
      value: totalAmount,
      custom_parameters: {
        currency: currency,
        item_count: itemCount,
        total_amount: totalAmount,
      },
    });
  }
};

// Track when a user downloads a PDF
export const trackPDFDownload = (currency: string, totalAmount: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'pdf_download', {
      event_category: 'Download',
      event_label: 'Invoice PDF',
      value: totalAmount,
      custom_parameters: {
        currency: currency,
        total_amount: totalAmount,
      },
    });
  }
};

// Track when a user uses saved company/item data
export const trackSavedDataUsed = (type: 'company' | 'item', action: 'selected' | 'saved') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'saved_data_used', {
      event_category: 'User Interaction',
      event_label: `${type}_${action}`,
      custom_parameters: {
        data_type: type,
        action: action,
      },
    });
  }
};

// Track currency selection
export const trackCurrencyChange = (newCurrency: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'currency_changed', {
      event_category: 'User Interaction',
      event_label: newCurrency,
      custom_parameters: {
        currency: newCurrency,
      },
    });
  }
};

// Track when user opens saved data manager
export const trackSavedDataManagerOpened = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'saved_data_manager_opened', {
      event_category: 'User Interaction',
      event_label: 'Manage Saved Data',
    });
  }
};

// Track form completion progress (when user has filled key fields)
export const trackFormProgress = (progress: 'basic_info' | 'invoice_details' | 'items_added' | 'complete') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'form_progress', {
      event_category: 'User Journey',
      event_label: progress,
      custom_parameters: {
        progress_stage: progress,
      },
    });
  }
};
