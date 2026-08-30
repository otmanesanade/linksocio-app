// Helper utilities to parse and identify media embeds (YouTube, Spotify, TikTok, Vimeo, SoundCloud)

export function getMediaEmbedInfo(url) {
  if (!url || typeof url !== 'string') return null

  const trimmed = url.trim()

  // 1. YouTube (Watch URL, Short URL, Shorts URL, Embed URL)
  // e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // e.g. https://youtu.be/dQw4w9WgXcQ
  // e.g. https://www.youtube.com/shorts/3X9v0...
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      provider: 'YouTube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=0&rel=0`,
      icon: '▶️',
      color: '#FF0000',
    }
  }

  // 2. Spotify (Tracks, Albums, Playlists, Artists, Podcasts)
  // e.g. https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
  // e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  // e.g. https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3
  const spotifyMatch = trimmed.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/)
  if (spotifyMatch && spotifyMatch[1] && spotifyMatch[2]) {
    const type = spotifyMatch[1]
    const id = spotifyMatch[2]
    const isCompact = type === 'track'
    return {
      type: 'spotify',
      provider: 'Spotify',
      embedType: type,
      mediaId: id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      height: isCompact ? 152 : 352,
      icon: '🎵',
      color: '#1DB954',
    }
  }

  // 3. TikTok
  // e.g. https://www.tiktok.com/@username/video/7123456789012345678
  const tiktokMatch = trimmed.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
  if (tiktokMatch && tiktokMatch[1]) {
    return {
      type: 'tiktok',
      provider: 'TikTok',
      videoId: tiktokMatch[1],
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      icon: '📱',
      color: '#000000',
    }
  }

  // 4. Vimeo
  // e.g. https://vimeo.com/76979871
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/)
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'vimeo',
      provider: 'Vimeo',
      videoId: vimeoMatch[3],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`,
      icon: '🎬',
      color: '#1AB7EA',
    }
  }

  // 5. SoundCloud
  // e.g. https://soundcloud.com/artist/track-name
  if (trimmed.includes('soundcloud.com/')) {
    return {
      type: 'soundcloud',
      provider: 'SoundCloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(trimmed)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      icon: '☁️',
      color: '#FF5500',
    }
  }

  return null
}
