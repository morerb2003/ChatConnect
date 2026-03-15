import { ToastContainer } from 'react-toastify'
import useTheme from '../hooks/useTheme'

function ThemedToastContainer(props) {
  const { theme } = useTheme()
  return <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} {...props} />
}

export default ThemedToastContainer

