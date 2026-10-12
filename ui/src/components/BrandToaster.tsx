import { Toaster } from 'react-hot-toast'
import { brandToastStyle } from '../lib/toast'

const BrandToaster = () => (
  <Toaster
    position="top-right"
    gutter={12}
    containerStyle={{
      top: 88,
      right: 16,
      left: 16,
    }}
    toastOptions={{
      duration: 4000,
      style: brandToastStyle,
    }}
  />
)

export default BrandToaster
