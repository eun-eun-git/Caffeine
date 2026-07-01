import React, { useEffect, useRef } from 'react'

function AdBanner({ position }) {
  const insRef = useRef(null)

  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      // AdSense script may not be loaded yet (e.g. local dev)
    }
  }, [])

  return (
    <div className={`ad-banner ad-banner--${position}`}>
      <span className="ad-label">Ad</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '60px' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="0000000000"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export default AdBanner
