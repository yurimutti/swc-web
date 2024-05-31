import { USStateCode } from '@/utils/shared/usStateUtils'

export const US_LOCATION_PAGES_LIVE_KEY_DISTRICTS_MAP: Partial<Record<USStateCode, number[]>> = {
  AL: [2],
  CO: [3, 7, 8],
  CA: [3, 9, 13, 22, 27, 41, 40, 47],
  IL: [13],
  IA: [3],
  MD: [6],
  OH: [9, 13],
  MI: [7, 8, 10],
  MT: [2],
  NY: [3, 4, 17, 18, 19, 22],
  NV: [1, 3, 4],
  NJ: [5, 8],
  OR: [5],
  PA: [1, 7, 8, 10],
  TX: [15, 28, 32, 34],
  IN: [1],
  VA: [7],
  SC: [1],
  AZ: [1, 6],
}

export const ENDORSED_DTSI_PERSON_SLUGS = [
  'shomari--figures',
  'troy---downing',
  'jim---banks',
  'jim--justice',
]
