import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import confetti from 'canvas-confetti'

// Compress & crop image to square canvas
async function compressImage(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate square crop / fit
        const minDim = Math.min(width, height)
        const sx = (width - minDim) / 2
        const sy = (height - minDim) / 2

        canvas.width = maxSize
        canvas.height = maxSize

        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize)

        // Convert to blob and dataUrl
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                dataUrl: canvas.toDataURL('image/jpeg', 0.88),
              })
            } else {
              reject(new Error('Canvas compression failed'))
            }
          },
          'image/jpeg',
          0.88
        )
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AvatarUpload({ user, profile, onUpdated }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef(null)

  const currentAvatar = profile?.avatar_url
  const initials =
    profile?.display_name?.[0]?.toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    '?'

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).')
      return
    }

    // 5MB limit before compression
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.')
      return
    }

    setErrorMsg('')
    setSuccessMsg('')
    setUploading(true)

    try {
      // 1. Compress image to high quality 400x400 square JPEG
      const { blob, dataUrl } = await compressImage(file, 400)

      let finalAvatarUrl = dataUrl

      // 2. Attempt Supabase Storage upload to 'avatars' bucket
      try {
        const fileExt = 'jpg'
        const fileName = `${user?.id || profile?.id}/avatar_${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (!uploadError && uploadData?.path) {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path)

          if (urlData?.publicUrl) {
            finalAvatarUrl = urlData.publicUrl
          }
        }
      } catch (storageErr) {
        console.warn('Storage upload fallback to direct avatar URL:', storageErr)
      }

      // 3. Update profile record
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: finalAvatarUrl })
        .eq('id', user?.id || profile?.id)

      if (dbError) {
        throw dbError
      }

      setSuccessMsg('Profile picture updated successfully!')
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } })
      } catch (e) {}

      if (onUpdated) await onUpdated()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Avatar update failed:', err)
      setErrorMsg(err.message || 'Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (!currentAvatar) return
    setUploading(true)
    setErrorMsg('')
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user?.id || profile?.id)

      if (dbError) throw dbError

      setSuccessMsg('Avatar removed. Restored letter icon.')
      if (onUpdated) await onUpdated()
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (err) {
      setErrorMsg('Failed to remove avatar.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: '#F8FAFC',
        border: dragOver ? '2px dashed #0D9488' : '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '16px 18px',
        transition: 'all 0.15s ease',
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        if (e.dataTransfer.files?.[0]) {
          handleFile(e.dataTransfer.files[0])
        }
      }}
    >
      {/* Avatar Preview */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: currentAvatar
              ? '#F1F5F9'
              : `linear-gradient(135deg, ${profile?.theme_color || '#14B8A6'}, #0F172A)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            overflow: 'hidden',
            border: '2px solid white',
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
          }}
        >
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            initials
          )}
        </div>

        {uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: '2px solid white',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}
      </div>

      {/* Controls & Actions */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
            Profile Picture / Logo
          </p>
          {currentAvatar && (
            <span style={{ fontSize: 11, background: '#E6F7F5', color: '#0D9488', fontWeight: 600, padding: '1px 7px', borderRadius: 100 }}>
              Custom
            </span>
          )}
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748B' }}>
          Upload your personal photo or brand logo (JPG, PNG, or WebP).
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0])
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#0F172A',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: uploading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <span>📷</span>
            <span>{currentAvatar ? 'Change Photo' : 'Upload Photo'}</span>
          </button>

          {currentAvatar && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              style={{
                background: 'white',
                color: '#EF4444',
                border: '1px solid #FECACA',
                borderRadius: 10,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: uploading ? 'default' : 'pointer',
              }}
            >
              Remove
            </button>
          )}
        </div>

        {errorMsg && (
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#EF4444' }}>
            ⚠️ {errorMsg}
          </p>
        )}
        {successMsg && (
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#0D9488', fontWeight: 600 }}>
            ✓ {successMsg}
          </p>
        )}
      </div>

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
