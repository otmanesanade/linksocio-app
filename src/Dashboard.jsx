import React, { useState } from 'react';

const initialLinks = [
  { id: 1, title: 'Instagram', url: 'https://www.instagram.com/otmane_sa', icon: '📷', clicks: 0, active: true, hasHint: true },
  { id: 2, title: 'WhatsApp', url: 'https://wa.me/34642887658', icon: '💬', clicks: 0, active: true, hasHint: false },
  { id: 3, title: 'TikTok', url: 'https://www.tiktok.com/@otmanesanade', icon: '🎵', clicks: 0, active: true, hasHint: false },
  { id: 4, title: 'blackteame', url: 'https://blackteame.com', icon: '🔗', clicks: 0, active: true, hasHint: false }
];

export default function Dashboard() {
  const [links, setLinks] = useState(initialLinks);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const toggleLink = (id) => {
    setLinks(links.map(l => l.id === id ? { ...l, active: !l.active } : l));
  };

  const deleteLink = (id) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const addLink = () => {
    if (newTitle.trim() && newUrl.trim()) {
      setLinks([...links, {
        id: Date.now(),
        title: newTitle,
        url: newUrl,
        icon: '🔗',
        clicks: 0,
        active: true,
        hasHint: false
      }]);
      setNewTitle('');
      setNewUrl('');
      setShowModal(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.userDropdown}>
          <div style={styles.userAvatar}>OS</div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>otmanesanade</span>
          <span style={{ marginLeft: 'auto', color: '#888' }}>▼</span>
        </div>
        <div style={styles.sidebarSection}>
          <div style={{ ...styles.sidebarItem, ...styles.sidebarItemActive }}>
            <span style={styles.sidebarIcon}>⊞</span>
            <span>My LinkSocio</span>
          </div>
          <div style={{ ...styles.sidebarItem, paddingLeft: '44px' }}>Links</div>
          <div style={{ ...styles.sidebarItem, paddingLeft: '44px' }}>Shop</div>
          <div style={{ ...styles.sidebarItem, paddingLeft: '44px' }}>Design</div>
        </div>
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>💰</span>
            <span>Earn</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888' }}>0.00 $US ▼</span>
          </div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>👥</span>
            <span>Audience</span>
          </div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>📊</span>
            <span>Insights</span>
          </div>
        </div>
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarSectionTitle}>Tools</div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>🃏</span>
            <span>Business cards</span>
            <span style={styles.newBadge}>NEW</span>
          </div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>📅</span>
            <span>Social planner</span>
          </div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>💬</span>
            <span>Instagram auto-reply</span>
          </div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>🔗</span>
            <span>Link shortener</span>
          </div>
          <div style={styles.sidebarItem}>
            <span style={styles.sidebarIcon}>💡</span>
            <span>Post ideas</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={styles.topBanner}>
          <span>Unlock more tools to grow your audience faster.</span>
          <button style={styles.upgradeBtn}>⚡ Upgrade</button>
        </div>
        <div style={styles.header}>
          <div style={styles.headerLeft}>Links</div>
          <div style={styles.headerRight}>
            <button style={styles.headerBtn}>✨ Enhance</button>
            <button style={styles.headerBtn}>👁</button>
            <button style={styles.headerBtn}>⚙</button>
            <div style={styles.urlBox}>
              <span>linksocio.com/otmanesanade</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>📋</button>
            </div>
          </div>
        </div>
        <div style={styles.content}>
          {/* Profile Section */}
          <div style={styles.profileSection}>
            <div style={styles.profileAvatar}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={styles.profileInfo}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>otmanesanade</h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>🌟 Creative heart | Sharing vibes & positivity | Join the journey! ✨</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={styles.socialIcon}>📷</div>
                <div style={styles.socialIcon}>💬</div>
                <div style={styles.socialIcon}>🎵</div>
                <div style={styles.socialIcon}>✏️</div>
              </div>
            </div>
          </div>

          <button style={styles.addBtn} onClick={() => setShowModal(true)}>+ Add link</button>

          <div style={styles.actionsBar}>
            <button style={styles.actionBtn}>📁 Add collection</button>
            <button style={styles.actionBtn}>📋 View archive &gt;</button>
          </div>

          {/* Link Cards */}
          {links.map(link => (
            <div key={link.id} style={styles.linkCard}>
              <div style={styles.linkCardHeader}>
                <div style={styles.linkTitle}>
                  <span style={{ color: '#aaa', cursor: 'grab' }}>⋮⋮</span>
                  {link.title}
                  <span style={{ color: '#888', cursor: 'pointer' }}>✏️</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#888', cursor: 'pointer' }}>📋</span>
                  <div
                    style={{ ...styles.toggle, ...(link.active ? {} : styles.toggleOff) }}
                    onClick={() => toggleLink(link.id)}
                  />
                  <span style={{ color: '#888', cursor: 'pointer' }} onClick={() => deleteLink(link.id)}>🗑</span>
                </div>
              </div>
              <div style={styles.linkUrl}>
                <span style={{ color: '#888' }}>🔗</span>
                {link.url}
                <span style={{ color: '#888', cursor: 'pointer' }}>✏️</span>
              </div>
              <div style={styles.linkFooter}>
                <button style={styles.linkFooterBtn}>📷</button>
                <button style={styles.linkFooterBtn}>🖼</button>
                <button style={styles.linkFooterBtn}>⭐</button>
                <button style={styles.linkFooterBtn}>🔥</button>
                <button style={styles.linkFooterBtn}>⏰</button>
                <button style={styles.linkFooterBtn}>🔒</button>
                <span style={{ fontSize: '13px', color: '#888', marginLeft: 'auto' }}>📊 {link.clicks} clicks</span>
              </div>
              {link.hasHint && (
                <div style={styles.bannerHint}>
                  Looking for a more visual display? <a href="#" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 500 }}>Connect your Instagram</a> ⓘ
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Panel */}
      <div style={styles.previewPanel}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#666', marginBottom: '16px' }}>Live Preview</div>
        <div style={styles.phoneFrame}>
          <div style={styles.phoneNotch}></div>
          <div style={styles.phoneScreen}>
            <div style={styles.phoneAvatar}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>otmanesanade</div>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px', lineHeight: 1.4 }}>🌟 Creative heart | Sharing vibes & positivity | Join the journey! ✨</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={styles.phoneSocial}>📷</div>
              <div style={styles.phoneSocial}>💬</div>
              <div style={styles.phoneSocial}>🎵</div>
            </div>
            {links.filter(l => l.active).map(link => (
              <div key={link.id} style={styles.phoneLink}>
                <div style={styles.phoneLinkImg}>
                  <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=80&h=80&fit=crop" alt={link.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{link.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={styles.modal}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Add new link</h3>
            <input
              style={styles.modalInput}
              type="text"
              placeholder="Title (e.g. Instagram)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <input
              style={styles.modalInput}
              type="text"
              placeholder="URL (e.g. https://instagram.com/...)"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={{ ...styles.modalBtn, ...styles.modalBtnCancel }} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={{ ...styles.modalBtn, ...styles.modalBtnSave }} onClick={addLink}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: '#f5f5f5', color: '#1a1a1a' },
  sidebar: { width: '240px', background: '#fff', borderRight: '1px solid #e5e5e5', padding: '16px 0', overflowY: 'auto' },
  userDropdown: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e5e5', marginBottom: '8px', cursor: 'pointer' },
  userAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 600 },
  sidebarSection: { marginBottom: '8px' },
  sidebarItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#444', transition: 'background 0.15s', position: 'relative' },
  sidebarItemActive: { background: '#f0e6ff', color: '#7c3aed', fontWeight: 500 },
  sidebarIcon: { width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  newBadge: { background: '#7c3aed', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginLeft: 'auto' },
  sidebarSectionTitle: { padding: '8px 16px', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topBanner: { background: '#1a1a2e', color: '#fff', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '14px' },
  upgradeBtn: { background: '#7c3aed', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' },
  header: { padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderBottom: '1px solid #e5e5e5' },
  headerLeft: { fontSize: '22px', fontWeight: 700 },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '20px', border: '1px solid #ddd', background: '#fff', fontSize: '13px', cursor: 'pointer' },
  urlBox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f5f5f5', borderRadius: '20px', fontSize: '13px' },
  content: { flex: 1, overflowY: 'auto', padding: '24px 32px' },
  profileSection: { background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px' },
  profileAvatar: { width: '64px', height: '64px', borderRadius: '50%', background: '#ddd', overflow: 'hidden', flexShrink: 0 },
  profileInfo: { flex: 1 },
  socialIcon: { width: '32px', height: '32px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' },
  addBtn: { width: '100%', padding: '14px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  actionsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #ddd', background: '#fff', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  linkCard: { background: '#fff', borderRadius: '16px', padding: '16px 20px', marginBottom: '12px', border: '2px solid transparent', transition: 'all 0.2s' },
  linkCardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  linkTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '15px' },
  toggle: { width: '40px', height: '22px', background: '#22c55e', borderRadius: '11px', position: 'relative', cursor: 'pointer' },
  toggleOff: { background: '#ccc' },
  linkUrl: { fontSize: '13px', color: '#555', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' },
  linkFooter: { display: 'flex', alignItems: 'center', gap: '8px' },
  linkFooterBtn: { width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' },
  bannerHint: { background: '#f0f7ff', borderRadius: '0 0 12px 12px', padding: '10px 16px', fontSize: '13px', color: '#555', margin: '-12px -20px 0', borderTop: '1px solid #e0e0e0' },
  previewPanel: { width: '380px', background: '#fff', borderLeft: '1px solid #e5e5e5', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  phoneFrame: { width: '280px', height: '560px', borderRadius: '32px', border: '12px solid #1a1a1a', overflow: 'hidden', background: '#000', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  phoneNotch: { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '28px', background: '#1a1a1a', borderRadius: '0 0 16px 16px', zIndex: 10 },
  phoneScreen: { height: '100%', overflowY: 'auto', background: '#000', color: '#fff', padding: '40px 20px 20px', textAlign: 'center' },
  phoneAvatar: { width: '80px', height: '80px', borderRadius: '50%', background: '#333', margin: '0 auto 12px', overflow: 'hidden' },
  phoneSocial: { width: '28px', height: '28px', borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
  phoneLink: { background: '#222', borderRadius: '12px', padding: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', cursor: 'pointer' },
  phoneLinkImg: { width: '40px', height: '40px', borderRadius: '8px', background: '#333', overflow: 'hidden', flexShrink: 0 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: '16px', padding: '24px', width: '420px', maxWidth: '90%' },
  modalInput: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', marginBottom: '12px', fontSize: '14px' },
  modalBtn: { padding: '10px 20px', borderRadius: '8px', border: 'none', fontSize: '14px', cursor: 'pointer' },
  modalBtnCancel: { background: '#f5f5f5', color: '#333' },
  modalBtnSave: { background: '#7c3aed', color: '#fff' }
};
