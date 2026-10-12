import { usePromoCode } from '../hooks/usePromoCode'

/** Mount once in App — saves ?promo= / ?code= from any page for checkout. */
export default function PromoCodeCapture() {
  usePromoCode({ captureFromUrl: true })
  return null
}
