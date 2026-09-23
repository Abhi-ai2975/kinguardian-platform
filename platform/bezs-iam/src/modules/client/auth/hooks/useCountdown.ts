import { useCallback, useEffect, useRef, useState } from "react"

export function useCountdown(defaultSeconds: number) {
  const [seconds, setSeconds] = useState(defaultSeconds)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 1. Internal helper: Just starts the interval (Does NOT trigger re-renders)
  const runTimer = useCallback(() => {
    clear()

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clear()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clear])

  // 2. Public Action: Resets state AND starts timer
  // Use this for buttons like "Restart" or "Start"
  const start = useCallback(
    (sec?: number) => {
      setSeconds(sec !== undefined ? sec : defaultSeconds) // This triggers the update
      runTimer()
    },
    [defaultSeconds, runTimer]
  )

  const restart = useCallback(() => {
    start(defaultSeconds)
  }, [start, defaultSeconds])

  // 3. Effect: Only start the timer on mount
  // Since useState(defaultSeconds) already handled the initial value,
  // we don't need to call 'start()' here. We just need 'runTimer()'.
  useEffect(() => {
    runTimer()

    return clear
  }, [runTimer, clear])

  return { seconds, restart, clear, start }
}
