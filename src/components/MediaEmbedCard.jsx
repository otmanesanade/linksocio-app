import { useState } from 'react'
import { getMediaEmbedInfo } from '../utils/mediaEmbed'

export default function MediaEmbedCard({ link, theme, btnStyle, isEmbedded = false, onMediaClick }) {
  const embed = getMediaEmbedInfo(link.url)
  const [isPlaying, setIsPlaying] = useState(false)

  if (!embed) return null

  const color = theme.accent || '#14B8A6'
  const cardBorderRadius = btnStyle?.borderRadius > 20 ? 18 : (btnStyle?.borderRadius || 16)

  return (
    <div
      style={{
        borderRadius: cardBorderRadius,
        border: btnStyle?.border || `1px solid ${color}25`,
        background: theme.buttonBg || 'rgba(0,0,0,0.03)',
        overflow: 'hidden',
        boxShadow: btnStyle?.boxShadow || '0 2px 10px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Media Header with Provider Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isEmbedded ? '8px 12px' : '10px 14px',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: isEmbedded ? 13 : 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {embed.icon}
          </span>
          <span
            style={{
              fontSize: isEmbedded ? 12 : 13.5,
              fontWeight: 700,
              color: theme.textColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {link.label || `${embed.provider} Media`}
          </span>
        </div>

        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (onMediaClick) onMediaClick(link, e)
          }}
          style={{
            fontSize: isEmbedded ? 10.5 : 11.5,
            fontWeight: 600,
            color: color,
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span>Open {embed.provider}</span>
          <span>↗</span>
        </a>
      </div>

      {/* Media Player Container */}
      <div style={{ position: 'relative', width: '100%', background: '#000' }}>
        {embed.type === 'youtube' && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
            <iframe
              src={embed.embedUrl}
              title={link.label || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </div>
        )}

        {embed.type === 'spotify' && (
          <iframe
            src={embed.embedUrl}
            title={link.label || 'Spotify player'}
            width="100%"
            height={isEmbedded ? (embed.embedType === 'track' ? 80 : 152) : (embed.embedType === 'track' ? 152 : 232)}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 0, display: 'block' }}
          />
        )}

        {embed.type === 'tiktok' && (
          <div style={{ position: 'relative', minHeight: isEmbedded ? 300 : 400, background: '#000' }}>
            <iframe
              src={embed.embedUrl}
              title={link.label || 'TikTok video'}
              allowFullScreen
              scrolling="no"
              style={{
                width: '100%',
                height: isEmbedded ? '360px' : '450px',
                border: 0,
              }}
            />
          </div>
        )}

        {embed.type === 'vimeo' && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
            <iframe
              src={embed.embedUrl}
              title={link.label || 'Vimeo player'}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </div>
        )}

        {embed.type === 'soundcloud' && (
          <iframe
            width="100%"
            height={isEmbedded ? 120 : 166}
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={embed.embedUrl}
            title={link.label || 'SoundCloud player'}
            style={{ border: 0, display: 'block' }}
          />
        )}
      </div>
    </div>
  )
}
