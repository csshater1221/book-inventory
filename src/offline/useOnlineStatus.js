import { useEffect, useState } from 'react'

/**
 * Tracks the browser's online/offline state. navigator.onLine only means
 * "the device has a network connection," not "the internet is actually
 * reachable," so a spotty connection can still read as online — which is
 * why the lookup calls also have their own timeouts (see
 * lookup/fetchWithTimeout.js) instead of trusting this alone.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
