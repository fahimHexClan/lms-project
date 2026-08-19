import { useEffect, useRef, useState } from 'react'

// Loads the YouTube IFrame Player API once and shares the promise across
// every player instance on the page.
let apiPromise = null
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// A fully custom-chrome YouTube player: native controls are switched off
// entirely (no settings gear, CC button, YouTube logo, or related-video
// links) and replaced with just play/pause, a seek bar, and a volume
// slider — exactly the controls a lecture viewer needs, nothing else.
export default function CustomYouTubePlayer({ videoId, title, watermark }) {
  const containerId = useRef(`yt-player-${videoId}-${Math.random().toString(36).slice(2)}`)
  const wrapperRef = useRef(null)
  const playerRef = useRef(null)
  const intervalRef = useRef(null)

  const [ready, setReady]         = useState(false)
  const [playing, setPlaying]     = useState(false)
  const [current, setCurrent]     = useState(0)
  const [duration, setDuration]   = useState(0)
  const [volume, setVolume]       = useState(100)
  const [muted, setMuted]         = useState(false)
  const [seeking, setSeeking]     = useState(false)
  const [rate, setRate]           = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [wmPos, setWmPos] = useState({ top: '10%', left: '8%' })
  const [wmTime, setWmTime] = useState(() => new Date().toLocaleString())

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  // Drift the watermark to a new random-ish corner every few seconds so it
  // can't just be cropped out of a screen recording.
  useEffect(() => {
    if (!watermark) return
    const spots = [
      { top: '8%',  left: '6%'  }, { top: '8%',  left: '78%' },
      { top: '80%', left: '6%'  }, { top: '80%', left: '78%' },
      { top: '42%', left: '42%' }, { top: '8%',  left: '42%' },
    ]
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % spots.length
      setWmPos(spots[i])
    }, 6000)
    return () => clearInterval(id)
  }, [watermark])

  // Keep the watermark's timestamp live — any recorded clip then carries
  // an exact date/time, making it traceable to a specific viewing session.
  useEffect(() => {
    if (!watermark) return
    const id = setInterval(() => setWmTime(new Date().toLocaleString()), 1000)
    return () => clearInterval(id)
  }, [watermark])

  // Auto-pause when the tab/window loses focus — this is a genuine (if
  // partial) deterrent: it interrupts casual "switch to a recorder app
  // while this plays in the background" attempts. It cannot stop a
  // dedicated full-screen capture device or a second camera pointed at
  // the screen — no web player can prevent that.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && playing) playerRef.current?.pauseVideo()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [playing])

  useEffect(() => {
    let destroyed = false

    loadYouTubeApi().then((YT) => {
      if (destroyed) return
      playerRef.current = new YT.Player(containerId.current, {
        videoId,
        playerVars: {
          controls: 0,        // hide ALL native controls — we render our own
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            setDuration(e.target.getDuration())
            setReady(true)
          },
          onStateChange: (e) => {
            setPlaying(e.data === window.YT.PlayerState.PLAYING)
          },
        },
      })
    })

    return () => {
      destroyed = true
      clearInterval(intervalRef.current)
      playerRef.current?.destroy?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // Poll current time while playing (YouTube API has no timeupdate event)
  useEffect(() => {
    if (!ready) return
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || seeking) return
      const t = playerRef.current.getCurrentTime?.()
      const d = playerRef.current.getDuration?.()
      if (typeof t === 'number') setCurrent(t)
      if (typeof d === 'number' && d > 0) setDuration(d)
    }, 400)
    return () => clearInterval(intervalRef.current)
  }, [ready, seeking])

  // Track native fullscreen state (so the icon flips correctly even if the
  // user exits via Esc rather than our own button)
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const togglePlay = () => {
    if (!playerRef.current) return
    playing ? playerRef.current.pauseVideo() : playerRef.current.playVideo()
  }

  const handleSeek = (e) => {
    const value = Number(e.target.value)
    setCurrent(value)
  }
  const commitSeek = (e) => {
    const value = Number(e.target.value)
    playerRef.current?.seekTo(value, true)
    setSeeking(false)
  }

  const handleVolume = (e) => {
    const value = Number(e.target.value)
    setVolume(value)
    playerRef.current?.setVolume(value)
    if (value === 0) {
      playerRef.current?.mute()
      setMuted(true)
    } else if (muted) {
      playerRef.current?.unMute()
      setMuted(false)
    }
  }

  const toggleMute = () => {
    if (!playerRef.current) return
    if (muted) {
      playerRef.current.unMute()
      setMuted(false)
      if (volume === 0) { setVolume(50); playerRef.current.setVolume(50) }
    } else {
      playerRef.current.mute()
      setMuted(true)
    }
  }

  const changeSpeed = (r) => {
    setRate(r)
    playerRef.current?.setPlaybackRate(r)
    setShowSpeedMenu(false)
  }

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      wrapperRef.current.requestFullscreen?.()
    }
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div
      ref={wrapperRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative bg-slate-900 overflow-hidden select-none ${isFullscreen ? 'w-screen h-screen flex items-center' : 'rounded-t-2xl'}`}
    >
      <div className={isFullscreen ? 'w-full h-full' : 'aspect-video'}>
        <div id={containerId.current} className="w-full h-full pointer-events-none" />
      </div>

      {/* Invisible click-catcher over the video to toggle play/pause,
          since native controls (and their click targets) are disabled */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 w-full h-full cursor-pointer"
        aria-label={playing ? 'Pause' : 'Play'}
        tabIndex={-1}
      />

      {/* Drifting identity watermark — deters casual screen-recording by
          making any capture traceable back to the viewing student. This is
          a deterrent, not a technical block: no web video can be made
          100% un-recordable, since the OS ultimately controls the display. */}
      {watermark && (
        <div
          className="absolute pointer-events-none text-white/35 text-xs sm:text-sm font-mono transition-all duration-[3000ms] ease-in-out leading-tight"
          style={{ top: wmPos.top, left: wmPos.left, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          <div>{watermark}</div>
          <div className="text-[10px] opacity-80">{wmTime}</div>
        </div>
      )}

      {/* Custom control bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pt-8 pb-2.5">
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onMouseDown={() => setSeeking(true)}
          onTouchStart={() => setSeeking(true)}
          onChange={handleSeek}
          onMouseUp={commitSeek}
          onTouchEnd={commitSeek}
          className="w-full h-1 accent-accent-500 cursor-pointer mb-2"
          style={{ background: `linear-gradient(to right, #f59e0b ${pct}%, rgba(255,255,255,0.25) ${pct}%)` }}
        />

        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="text-white flex-shrink-0" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <span className="text-white text-xs font-mono flex-shrink-0">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button onClick={toggleMute} className="text-white flex-shrink-0" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12A4.5 4.5 0 0014.5 8v1.5a3 3 0 011 2.24 3 3 0 01-1 2.24V15.5A4.5 4.5 0 0016.5 12zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.5 4.5 0 0016.5 12zM14 4.45v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-16 h-1 accent-accent-500 cursor-pointer"
          />

          {/* Playback speed */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowSpeedMenu(s => !s)}
              className="text-white text-xs font-mono px-1.5 py-0.5 rounded border border-white/30 hover:bg-white/10"
            >
              {rate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-slate-800 rounded-lg shadow-card-hover py-1 min-w-[64px] z-10">
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`block w-full text-left px-3 py-1 text-xs hover:bg-white/10 ${s === rate ? 'text-accent-400 font-600' : 'text-white'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white flex-shrink-0" aria-label="Fullscreen">
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 3H5a2 2 0 00-2 2v3h2V5h3V3zm11 5V5a2 2 0 00-2-2h-3v2h3v3h2zM5 16v3a2 2 0 002 2h3v-2H5v-3H3zm14 3v-3h2v3a2 2 0 01-2 2h-3v-2h3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h3v2H5v3H3V5zm18 0v3h-2V5h-3V3h3a2 2 0 012 2zM3 16h2v3h3v2H5a2 2 0 01-2-2v-3zm18 0v3a2 2 0 01-2 2h-3v-2h3v-3h2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}