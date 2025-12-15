// Standardized breakpoints matching Tailwind defaults
export const BREAKPOINTS = {
  sm: 640,   // Small phones
  md: 768,   // Large phones / small tablets
  lg: 1024,  // Tablets / small laptops
  xl: 1280,  // Desktop
  '2xl': 1536, // Large desktop
} as const;

// Mobile breakpoint for useIsMobile hook
export const MOBILE_BREAKPOINT = BREAKPOINTS.md;

// Bottom nav height for layout calculations
export const BOTTOM_NAV_HEIGHT = 64;

// Safe area padding class
export const SAFE_AREA_BOTTOM = 'pb-safe';
