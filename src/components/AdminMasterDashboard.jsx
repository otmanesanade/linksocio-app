import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../context/LanguageContext'

const ADMIN_I18N = {
  ar: {
    title: 'LinkSocio Admin Master Hub',
    subtitle: 'لوحة الإدارة المركزية: متابعة طلبات السحب (Withdrawals)، عمولة المنصة (9%)، المستخدمين وصناع المحتوى',
    profit9: '💰 ربح المنصة (9% Commission)',
    profitSub: 'صافي دخل الموقع من المبيعات',
    gross: '📈 إجمالي المبيعات (Gross)',
    grossSub: 'مجموع المعاملات 100%',
    pending: '⏳ طلبات سحب معلقة',
    pendingWarning: '⚠️ تتطلب مراجعتك وتحويلك',
    pendingNone: 'كل الطلبات مدفوعة',
    paidOut: '✅ المبالغ المحولة للبائعين',
    paidOutSub: 'تم تحويلها لحساباتهم',
    usersProducts: '👥 المستخدمين والمنتجات',
    creatorsCount: 'صانع محتوى',
    productsCount: 'منتج معروض',
    tabWithdrawals: '💸 طلبات السحب (Withdrawals)',
    tabUsers: '👥 المستخدمين والعملاء',
    tabOrders: '📦 المبيعات والمعاملات',
    tabRevenue: '📊 تقارير الـ 9% والتصدير',
    searchWithdrawals: '🔍 بحث بالاسم، اسم المستخدم، البريد، الـ RIB، أو رقم الهاتف...',
    searchUsers: '🔍 بحث باسم المستخدم، البريد الإلكتروني، أو رقم الهاتف...',
    searchOrders: '🔍 بحث بالمنتج، البائع، اسم الزبون، أو الإيميل...',
    filterAll: 'الكل',
    filterPending: '⏳ معلقة',
    filterCompleted: '✓ مدفوعة',
    filterRejected: '✕ مرفوضة',
    emptyWithdrawals: 'لا توجد طلبات سحب تطابق البحث',
    emptyWithdrawalsSub: 'كل طلبات السحب التي يقدمها البائعون ستظهر هنا فوراً.',
    whatsappSeller: 'واتساب البائع',
    copyRib: 'نسخ الـ RIB',
    copyEmail: 'نسخ الإيميل',
    copyCin: 'نسخ الـ CIN',
    approveBtn: 'الموافقة وتأكيد التحويل',
    rejectBtn: '✕ رفض',
    modalApproveTitle: 'تأكيد سحب المبلغ للبائع ✓',
    modalApproveAmount: 'المبلغ المراد تحويله:',
    refLabel: 'رقم المعاملة أو مرجع التحويل البنكي (Référence Virement):',
    refPlaceholder: 'مثال: VIR_CIH_98412 أو PAYPAL_TX_002',
    notesLabel: 'ملاحظات إضافية (تظهر للبائع):',
    notesPlaceholder: 'تم التحويل بنجاح لحسابكم البنكي...',
    confirmApprove: 'تأكيد التحويل وخصم الرصيد ✓',
    cancel: 'إلغاء',
    modalRejectTitle: 'رفض طلب السحب ✕',
    modalRejectDesc: 'يرجى كتابة سبب الرفض لتوضيحه للبائع (مثلاً: رقم الـ RIB غير صحيح، أو الاسم غير مطابق):',
    rejectPlaceholder: 'مثال: رقم الـ RIB المكون من 24 رقماً غير صحيح، يرجى تحديث بيانات الحساب...',
    confirmReject: 'تأكيد الرفض ✕',
    visitProfile: 'زيارة الصفحة ↗',
    balanceRemaining: 'رصيده المتبقي:',
    exportOrders: '📥 تصدير المبيعات CSV',
    exportWithdrawals: '📥 تصدير السحوبات CSV',
    refresh: 'Actualiser',
    refreshing: 'Mise à jour...',
    currencyBadge: 'العملة الإدارية:',
    rateNote: '1 € = 11 DH',
  },
  fr: {
    title: 'LinkSocio Admin Master Hub',
    subtitle: 'Centre d\'administration: gestion des retraits, commission 9%, utilisateurs et registre des ventes',
    profit9: '💰 Revenus Plateforme (9% Frais)',
    profitSub: 'Bénéfice net généré sur les ventes',
    gross: '📈 Volume Brut des Ventes (Gross)',
    grossSub: 'Total des transactions 100%',
    pending: '⏳ Retraits en Attente',
    pendingWarning: '⚠️ Requiert votre virement bancaire',
    pendingNone: 'Tous les retraits sont payés',
    paidOut: '✅ Montants Transférés aux Vendeurs',
    paidOutSub: 'Versés sur leurs comptes',
    usersProducts: '👥 Utilisateurs & Produits',
    creatorsCount: 'créateurs',
    productsCount: 'produits actifs',
    tabWithdrawals: '💸 Demandes de Retrait',
    tabUsers: '👥 Vendeurs & Clients',
    tabOrders: '📦 Commandes & Ventes',
    tabRevenue: '📊 Rapports Financiers & 9%',
    searchWithdrawals: '🔍 Rechercher par nom, username, email, RIB ou téléphone...',
    searchUsers: '🔍 Rechercher par username, email ou téléphone...',
    searchOrders: '🔍 Rechercher par produit, vendeur, client ou email...',
    filterAll: 'Tous',
    filterPending: '⏳ En attente',
    filterCompleted: '✓ Payés',
    filterRejected: '✕ Rejetés',
    emptyWithdrawals: 'Aucune demande de retrait trouvée',
    emptyWithdrawalsSub: 'Les demandes de retrait apparaîtront ici immédiatement.',
    whatsappSeller: 'WhatsApp Vendeur',
    copyRib: 'Copier RIB',
    copyEmail: 'Copier Email',
    copyCin: 'Copier CIN',
    approveBtn: 'Valider le Virement',
    rejectBtn: '✕ Rejeter',
    modalApproveTitle: 'Confirmer le Virement Bancaire ✓',
    modalApproveAmount: 'Montant à virer:',
    refLabel: 'Numéro de transaction ou référence du virement:',
    refPlaceholder: 'Ex: VIR_CIH_98412 ou PAYPAL_TX_002',
    notesLabel: 'Notes additionnelles (visibles par le vendeur):',
    notesPlaceholder: 'Virement effectué avec succès...',
    confirmApprove: 'Confirmer le Virement et Déduire ✓',
    cancel: 'Annuler',
    modalRejectTitle: 'Rejeter la Demande de Retrait ✕',
    modalRejectDesc: 'Veuillez préciser le motif du rejet (ex: RIB invalide ou non conforme):',
    rejectPlaceholder: 'Ex: Le RIB à 24 chiffres est incorrect...',
    confirmReject: 'Confirmer le Rejet ✕',
    visitProfile: 'Voir la page ↗',
    balanceRemaining: 'Solde disponible:',
    exportOrders: '📥 Exporter Commandes CSV',
    exportWithdrawals: '📥 Exporter Retraits CSV',
    refresh: 'Actualiser',
    refreshing: 'Mise à jour...',
    currencyBadge: 'Devise Admin:',
    rateNote: '1 € = 11 DH',
  },
  en: {
    title: 'LinkSocio Admin Master Hub',
    subtitle: 'Central administrative dashboard: withdrawal approvals, 9% platform fee, creators directory, and sales ledger',
    profit9: '💰 Platform Profit (9% Fee)',
    profitSub: 'Net platform revenue from sales',
    gross: '📈 Total Gross Volume (Gross)',
    grossSub: '100% total sales volume',
    pending: '⏳ Pending Withdrawals',
    pendingWarning: '⚠️ Requires your wire transfer',
    pendingNone: 'All withdrawals settled',
    paidOut: '✅ Total Transferred to Sellers',
    paidOutSub: 'Settled to their accounts',
    usersProducts: '👥 Users & Digital Products',
    creatorsCount: 'creators',
    productsCount: 'listed products',
    tabWithdrawals: '💸 Withdrawal Requests',
    tabUsers: '👥 Sellers & Customers',
    tabOrders: '📦 Sales & Orders Ledger',
    tabRevenue: '📊 Revenue Analytics & Export',
    searchWithdrawals: '🔍 Search by name, username, email, RIB, or phone...',
    searchUsers: '🔍 Search by username, email, or phone...',
    searchOrders: '🔍 Search by product, seller, customer, or email...',
    filterAll: 'All',
    filterPending: '⏳ Pending',
    filterCompleted: '✓ Paid',
    filterRejected: '✕ Rejected',
    emptyWithdrawals: 'No withdrawal requests match your search',
    emptyWithdrawalsSub: 'Seller withdrawal requests will appear here instantly.',
    whatsappSeller: 'WhatsApp Seller',
    copyRib: 'Copy RIB',
    copyEmail: 'Copy Email',
    copyCin: 'Copy CIN',
    approveBtn: 'Approve & Confirm Wire',
    rejectBtn: '✕ Reject',
    modalApproveTitle: 'Confirm Payout Wire Transfer ✓',
    modalApproveAmount: 'Amount to transfer:',
    refLabel: 'Bank transfer reference number (Référence Virement):',
    refPlaceholder: 'e.g. VIR_CIH_98412 or PAYPAL_TX_002',
    notesLabel: 'Additional notes (visible to seller):',
    notesPlaceholder: 'Payment successfully sent to your account...',
    confirmApprove: 'Confirm Transfer & Deduct Balance ✓',
    cancel: 'Cancel',
    modalRejectTitle: 'Reject Withdrawal Request ✕',
    modalRejectDesc: 'Please provide the rejection reason for the seller (e.g. invalid RIB or account name mismatch):',
    rejectPlaceholder: 'e.g. 24-digit RIB is incorrect, please update your payout details...',
    confirmReject: 'Confirm Rejection ✕',
    visitProfile: 'Visit Page ↗',
    balanceRemaining: 'Available balance:',
    exportOrders: '📥 Export Orders CSV',
    exportWithdrawals: '📥 Export Payouts CSV',
    refresh: 'Refresh',
    refreshing: 'Updating...',
    currencyBadge: 'Admin Currency:',
    rateNote: '1 € = 11 DH',
  },
  es: {
    title: 'LinkSocio Admin Master Hub',
    subtitle: 'Panel de administración central: retiros, comisión del 9%, creadores y pedidos',
    profit9: '💰 Beneficio Plataforma (9%)',
    profitSub: 'Ingreso neto de ventas',
    gross: '📈 Volumen Bruto (Gross)',
    grossSub: '100% total transacciones',
    pending: '⏳ Retiros Pendientes',
    pendingWarning: '⚠️ Requiere tu transferencia',
    pendingNone: 'Todos los pagos liquidados',
    paidOut: '✅ Pagado a Vendedores',
    paidOutSub: 'Transferido a sus cuentas',
    usersProducts: '👥 Usuarios y Productos',
    creatorsCount: 'creadores',
    productsCount: 'productos activos',
    tabWithdrawals: '💸 Solicitudes de Retiro',
    tabUsers: '👥 Vendedores y Clientes',
    tabOrders: '📦 Registro de Pedidos',
    tabRevenue: '📊 Informes Financieros y 9%',
    searchWithdrawals: '🔍 Buscar por nombre, usuario, email, RIB o teléfono...',
    searchUsers: '🔍 Buscar por usuario, email o teléfono...',
    searchOrders: '🔍 Buscar por producto, vendedor, cliente o email...',
    filterAll: 'Todos',
    filterPending: '⏳ Pendientes',
    filterCompleted: '✓ Pagados',
    filterRejected: '✕ Rechazados',
    emptyWithdrawals: 'No hay solicitudes de retiro',
    emptyWithdrawalsSub: 'Las solicitudes de retiro aparecerán aquí.',
    whatsappSeller: 'WhatsApp Vendedor',
    copyRib: 'Copiar RIB',
    copyEmail: 'Copiar Email',
    copyCin: 'Copiar CIN',
    approveBtn: 'Confirmar Transferencia',
    rejectBtn: '✕ Rechazar',
    modalApproveTitle: 'Confirmar Transferencia Bancaria ✓',
    modalApproveAmount: 'Importe a transferir:',
    refLabel: 'Referencia bancaria de la transacción:',
    refPlaceholder: 'Ej: VIR_CIH_98412 o PAYPAL_TX_002',
    notesLabel: 'Notas adicionales (visibles por el vendedor):',
    notesPlaceholder: 'Transferencia realizada con éxito...',
    confirmApprove: 'Confirmar Transferencia y Deducir ✓',
    cancel: 'Cancelar',
    modalRejectTitle: 'Rechazar Solicitud de Retiro ✕',
    modalRejectDesc: 'Especifica el motivo del rechazo:',
    rejectPlaceholder: 'Ej: El número de cuenta / RIB es incorrecto...',
    confirmReject: 'Confirmar Rechazo ✕',
    visitProfile: 'Ver Página ↗',
    balanceRemaining: 'Saldo disponible:',
    exportOrders: '📥 Exportar Pedidos CSV',
    exportWithdrawals: '📥 Exportar Retiros CSV',
    refresh: 'Actualizar',
    refreshing: 'Actualizando...',
    currencyBadge: 'Moneda Admin:',
    rateNote: '1 € = 11 DH',
  }
}

export default function AdminMasterDashboard({ user, profile, onNavigateToTab }) {
  const { language, isRTL, isAuto } = useLanguage()
  const tUI = ADMIN_I18N[language] || ADMIN_I18N.fr || ADMIN_I18N.en

  // Admin Currency: EUR (€) by default as explicitly requested by owner!
  const [adminCurrency, setAdminCurrency] = useState('EUR') // 'EUR' | 'MAD'
  const [exchangeRate, setExchangeRate] = useState(11.0) // 1 EUR = 11.00 DH

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState({
    financials: {
      totalGross: 0,
      totalFees9Percent: 0,
      totalSellerNet91Percent: 0,
      totalPaidOut: 0,
      pendingWithdrawalsAmount: 0,
      pendingWithdrawalsCount: 0,
      totalTransactionsCount: 0,
      totalUsersCount: 0,
      totalProductsCount: 0,
      platformFeeRate: 9,
    },
    payoutRequests: [],
    transactions: [],
    users: [],
  })

  const [activeSubTab, setActiveSubTab] = useState('withdrawals') // 'withdrawals' | 'users' | 'orders' | 'revenue'
  const [payoutFilter, setPayoutFilter] = useState('all') // 'all' | 'processing' | 'completed' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  // Modals state
  const [selectedPayout, setSelectedPayout] = useState(null)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [paymentRefInput, setPaymentRefInput] = useState('')
  const [actionNotesInput, setActionNotesInput] = useState('')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReasonInput, setRejectReasonInput] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null)

  // Format money helper: converts DH to EUR (€) as primary
  function formatMoney(amountInDh) {
    const dh = Number(amountInDh) || 0
    const eur = dh / exchangeRate
    if (adminCurrency === 'EUR') {
      return {
        main: eur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
        sub: dh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH',
      }
    } else {
      return {
        main: dh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH',
        sub: eur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
      }
    }
  }

  async function loadAdminData() {
    try {
      setRefreshing(true)
      const res = await fetch('/api/admin/overview')
      const json = await res.json()
      if (json.success) {
        setData(json)
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  function copyToClipboard(text, id) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handlePayoutAction(action) {
    if (!selectedPayout) return
    setSubmittingAction(true)
    try {
      const res = await fetch('/api/admin/payouts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: selectedPayout.id,
          action,
          paymentRef: paymentRefInput.trim(),
          rejectionReason: rejectReasonInput.trim(),
          notes: actionNotesInput.trim(),
        }),
      })
      const result = await res.json()
      if (result.success) {
        setActionSuccessMsg(
          action === 'approve'
            ? '✓ Virement validé avec succès!'
            : action === 'reject'
            ? 'Demande rejetée.'
            : 'Statut mis à jour.'
        )
        setApproveModalOpen(false)
        setRejectModalOpen(false)
        setPaymentRefInput('')
        setRejectReasonInput('')
        setActionNotesInput('')
        setSelectedPayout(null)
        await loadAdminData()
        setTimeout(() => setActionSuccessMsg(null), 3500)
      } else {
        alert(result.error || 'Erreur lors de la mise à jour')
      }
    } catch (e) {
      alert('Erreur réseau: ' + e.message)
    } finally {
      setSubmittingAction(false)
    }
  }

  async function handleOrderConfirm(txId) {
    if (!confirm('Confirmer et valider cette commande manuellement?')) return
    try {
      const res = await fetch('/api/admin/orders/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txId,
          action: 'confirm',
        }),
      })
      const result = await res.json()
      if (result.success) {
        await loadAdminData()
        setActionSuccessMsg('✓ Commande confirmée et validée!')
        setTimeout(() => setActionSuccessMsg(null), 3000)
      }
    } catch (e) {
      alert('Erreur: ' + e.message)
    }
  }

  // Export CSV functions with EUR (€) as primary
  function exportWithdrawalsCSV() {
    const headers = ['ID', 'Date', 'Creator Username', 'Creator Email', 'Amount EUR (€)', 'Amount MAD (DH)', 'Method', 'Bank/RIB/PayPal/CIN', 'Status', 'Ref Virement']
    const rows = (data.payoutRequests || []).map((p) => {
      const dh = Number(p.amount) || 0
      const eur = (dh / exchangeRate).toFixed(2)
      return [
        p.id,
        p.createdAt || '',
        p.creatorUsername || '',
        p.creatorEmail || '',
        eur,
        dh,
        p.method || '',
        `"${p.details?.iban || p.details?.rib || p.details?.paypalEmail || p.details?.cin || p.details?.accountNumber || ''}"`,
        p.status || '',
        p.paymentRef || '',
      ]
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `linksocio_withdrawals_eur_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function exportOrdersCSV() {
    const headers = ['Order ID', 'Date', 'Product', 'Seller', 'Customer Name', 'Customer Email', 'Gross EUR (€)', 'Gross MAD (DH)', 'Platform Fee 9% (€)', 'Seller Net 91% (€)', 'Payment Method', 'Status']
    const rows = (data.transactions || []).map((t) => {
      const grossDh = Number(t.grossAmount) || 0
      const feeDh = Number(t.platformFee) || Math.round(grossDh * 0.09 * 100) / 100
      const netDh = Number(t.sellerNet) || Math.round(grossDh * 0.91 * 100) / 100
      return [
        t.id,
        t.createdAt || '',
        `"${t.productName || 'Product'}"`,
        t.sellerUsername || '',
        `"${t.customerName || ''}"`,
        t.customerEmail || '',
        (grossDh / exchangeRate).toFixed(2),
        grossDh,
        (feeDh / exchangeRate).toFixed(2),
        (netDh / exchangeRate).toFixed(2),
        t.method || '',
        t.status || '',
      ]
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `linksocio_orders_eur_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtered withdrawals
  const filteredPayouts = useMemo(() => {
    return (data.payoutRequests || []).filter((p) => {
      const matchFilter =
        payoutFilter === 'all'
          ? true
          : payoutFilter === 'processing'
          ? p.status === 'processing' || p.status === 'requested'
          : p.status === payoutFilter

      if (!matchFilter) return false
      if (!searchQuery.trim()) return true

      const q = searchQuery.toLowerCase().trim()
      return (
        (p.creatorUsername || '').toLowerCase().includes(q) ||
        (p.creatorEmail || '').toLowerCase().includes(q) ||
        (p.creatorPhone || '').toLowerCase().includes(q) ||
        (p.method || '').toLowerCase().includes(q) ||
        (p.details?.iban || '').toLowerCase().includes(q) ||
        (p.details?.paypalEmail || '').toLowerCase().includes(q) ||
        (p.details?.fullName || '').toLowerCase().includes(q)
      )
    })
  }, [data.payoutRequests, payoutFilter, searchQuery])

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return data.users || []
    const q = searchQuery.toLowerCase().trim()
    return (data.users || []).filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.whatsapp || '').toLowerCase().includes(q) ||
        (u.location || '').toLowerCase().includes(q)
    )
  }, [data.users, searchQuery])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return data.transactions || []
    const q = searchQuery.toLowerCase().trim()
    return (data.transactions || []).filter(
      (t) =>
        (t.id || '').toLowerCase().includes(q) ||
        (t.productName || '').toLowerCase().includes(q) ||
        (t.sellerUsername || '').toLowerCase().includes(q) ||
        (t.customerName || '').toLowerCase().includes(q) ||
        (t.customerEmail || '').toLowerCase().includes(q) ||
        (t.method || '').toLowerCase().includes(q)
    )
  }, [data.transactions, searchQuery])

  const pendingCount = (data.payoutRequests || []).filter(
    (p) => p.status === 'processing' || p.status === 'requested'
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            background: '#047857',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(4, 120, 87, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>🎉</span>
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: 20,
          padding: '24px 28px',
          color: 'white',
          border: '1px solid #334155',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                boxShadow: '0 4px 12px rgba(20, 184, 166, 0.35)',
              }}
            >
              👑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  {tUI.title}
                </h2>
                <span
                  style={{
                    background: '#14B8A6',
                    color: '#0F172A',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 100,
                  }}
                >
                  ADMIN LEVEL 100
                </span>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#94A3B8',
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 100,
                  }}
                >
                  {language.toUpperCase()} {isAuto ? '(AUTO)' : ''}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94A3B8' }}>
                {tUI.subtitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Currency Switcher Pill */}
            <button
              type="button"
              onClick={() => setAdminCurrency(adminCurrency === 'EUR' ? 'MAD' : 'EUR')}
              title="Changer la devise d'affichage de l'administration"
              style={{
                background: adminCurrency === 'EUR' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255,255,255,0.08)',
                border: adminCurrency === 'EUR' ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.15)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: adminCurrency === 'EUR' ? '0 2px 10px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>💶</span>
              <span>{tUI.currencyBadge} {adminCurrency === 'EUR' ? '€ (EUR)' : 'DH (MAD)'}</span>
              <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>({tUI.rateNote})</span>
            </button>

            <button
              type="button"
              onClick={loadAdminData}
              disabled={refreshing}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: '0.4s' }}>🔄</span>
              <span>{refreshing ? tUI.refreshing : tUI.refresh}</span>
            </button>

            <button
              type="button"
              onClick={exportWithdrawalsCSV}
              style={{
                background: '#0D9488',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📥</span>
              <span>CSV (€ & DH)</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Cards - Formatted in € (EUR) with DH secondary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
            gap: 12,
            marginTop: 6,
          }}
        >
          {/* 9% Platform Profit */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.18) 0%, rgba(13, 148, 136, 0.28) 100%)',
              border: '1px solid #14B8A6',
              borderRadius: 14,
              padding: '14px 16px',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2DD4BF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tUI.profit9}
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#FFFFFF', marginTop: 4 }}>
              {formatMoney(data.financials.totalFees9Percent || 0).main}
            </div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              ≈ {formatMoney(data.financials.totalFees9Percent || 0).sub} · {tUI.profitSub}
            </span>
          </div>

          {/* Gross Sales */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tUI.gross}
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>
              {formatMoney(data.financials.totalGross || 0).main}
            </div>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              ≈ {formatMoney(data.financials.totalGross || 0).sub} · {tUI.grossSub}
            </span>
          </div>

          {/* Pending Withdrawals */}
          <div
            style={{
              background: pendingCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.04)',
              border: pendingCount > 0 ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '14px 16px',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: pendingCount > 0 ? '#FBBF24' : '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tUI.pending} ({pendingCount})
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: pendingCount > 0 ? '#FDE68A' : '#FFFFFF', marginTop: 4 }}>
              {formatMoney(data.financials.pendingWithdrawalsAmount || 0).main}
            </div>
            <span style={{ fontSize: 11, color: pendingCount > 0 ? '#FCD34D' : '#64748B' }}>
              ≈ {formatMoney(data.financials.pendingWithdrawalsAmount || 0).sub} · {pendingCount > 0 ? tUI.pendingWarning : tUI.pendingNone}
            </span>
          </div>

          {/* Paid Out */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tUI.paidOut}
            </span>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>
              {formatMoney(data.financials.totalPaidOut || 0).main}
            </div>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              ≈ {formatMoney(data.financials.totalPaidOut || 0).sub} · {tUI.paidOutSub}
            </span>
          </div>

          {/* Users & Products Count */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tUI.usersProducts}
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>
              {data.financials.totalUsersCount || 0} {tUI.creatorsCount}
            </div>
            <span style={{ fontSize: 11, color: '#64748B' }}>{data.financials.totalProductsCount || 0} {tUI.productsCount}</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#F1F5F9',
          padding: 6,
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('withdrawals')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'withdrawals' ? '#0F172A' : 'transparent',
            color: activeSubTab === 'withdrawals' ? '#FFFFFF' : '#475569',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{tUI.tabWithdrawals}</span>
          {pendingCount > 0 && (
            <span
              style={{
                background: '#EF4444',
                color: 'white',
                fontSize: 10,
                fontWeight: 900,
                padding: '2px 7px',
                borderRadius: 100,
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('users')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'users' ? '#0F172A' : 'transparent',
            color: activeSubTab === 'users' ? '#FFFFFF' : '#475569',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{tUI.tabUsers} ({data.users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'orders' ? '#0F172A' : 'transparent',
            color: activeSubTab === 'orders' ? '#FFFFFF' : '#475569',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{tUI.tabOrders} ({data.transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('revenue')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'revenue' ? '#0F172A' : 'transparent',
            color: activeSubTab === 'revenue' ? '#FFFFFF' : '#475569',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{tUI.tabRevenue}</span>
        </button>
      </div>

      {/* SUBTAB 1: WITHDRAWAL REQUESTS */}
      {activeSubTab === 'withdrawals' && (
        <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                {tUI.tabWithdrawals}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                {language === 'ar'
                  ? 'قم بمراجعة الحسابات البنكية للمبدعين وإرسال الأموال ثم تأكيد التحويل لخصم الرصيد.'
                  : 'Vérifiez les comptes bancaires des vendeurs, effectuez le virement puis validez ici.'}
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `${tUI.filterAll} (${data.payoutRequests.length})` },
                { id: 'processing', label: `${tUI.filterPending} (${pendingCount})` },
                { id: 'completed', label: `${tUI.filterCompleted} (${data.payoutRequests.filter((p) => p.status === 'completed' || p.status === 'paid').length})` },
                { id: 'rejected', label: `${tUI.filterRejected} (${data.payoutRequests.filter((p) => p.status === 'rejected').length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPayoutFilter(f.id)}
                  style={{
                    background: payoutFilter === f.id ? '#0F172A' : '#F1F5F9',
                    color: payoutFilter === f.id ? '#FFFFFF' : '#475569',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tUI.searchWithdrawals}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                outline: 'none',
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
          </div>

          {/* List of Withdrawals */}
          {filteredPayouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>{tUI.emptyWithdrawals}</div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>{tUI.emptyWithdrawalsSub}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredPayouts.map((req) => {
                const isPending = req.status === 'processing' || req.status === 'requested'
                const isCompleted = req.status === 'completed' || req.status === 'paid'
                const isRejected = req.status === 'rejected'

                const details = req.details || {}
                const rib = details.rib || details.iban || details.accountNumber || ''
                const paypal = details.paypalEmail || ''
                const cin = details.cin || ''
                const bankName = details.bankName || (req.method === 'bank_cih' ? 'CIH Bank' : 'Virement Bancaire')
                const accountHolder = details.accountHolder || details.fullName || req.creatorUsername || ''

                // Creator WhatsApp link
                const creatorPhone = req.creatorPhone || details.phone || ''
                const cleanPhone = creatorPhone.replace(/[^0-9+]/g, '')
                const waMessage = encodeURIComponent(
                  `Bonjour ${req.creatorUsername}, concernant votre demande de retrait LinkSocio de ${formatMoney(req.amount).main} (${req.amount} DH)...`
                )
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${waMessage}` : null

                return (
                  <div
                    key={req.id}
                    style={{
                      background: isPending ? '#FFFBEB' : isCompleted ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${isPending ? '#FDE68A' : isCompleted ? '#BBF7D0' : '#FECACA'}`,
                      borderRadius: 16,
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              background: isPending ? '#F59E0B' : isCompleted ? '#10B981' : '#EF4444',
                              color: 'white',
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 100,
                              textTransform: 'uppercase',
                            }}
                          >
                            {isPending ? tUI.filterPending : isCompleted ? tUI.filterCompleted : tUI.filterRejected}
                          </span>
                          <span style={{ fontSize: 12, color: '#64748B' }}>
                            {req.createdAt ? new Date(req.createdAt).toLocaleString('fr-FR') : ''}
                          </span>
                          <span style={{ fontSize: 11, background: '#E2E8F0', padding: '1px 6px', borderRadius: 6, color: '#475569' }}>
                            Ref: {req.id}
                          </span>
                        </div>

                        {/* Amount in EUR (€) as Primary */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: '#0F172A' }}>
                            {formatMoney(req.amount).main}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0D9488' }}>
                            ({formatMoney(req.amount).sub})
                          </span>
                          <span style={{ fontSize: 13, color: '#475569' }}>
                            @{req.creatorUsername}
                          </span>
                          {req.creatorEmail && (
                            <span style={{ fontSize: 12, color: '#64748B' }}>({req.creatorEmail})</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons for Admin */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25D366',
                              color: 'white',
                              textDecoration: 'none',
                              padding: '7px 12px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>💬</span>
                            <span>{tUI.whatsappSeller}</span>
                          </a>
                        )}

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(req)
                                setApproveModalOpen(true)
                              }}
                              style={{
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 14px',
                                fontSize: 12.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                              }}
                            >
                              <span>✓</span>
                              <span>{tUI.approveBtn}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(req)
                                setRejectModalOpen(true)
                              }}
                              style={{
                                background: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 12px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {tUI.rejectBtn}
                            </button>
                          </>
                        )}

                        {isCompleted && req.paymentRef && (
                          <div style={{ fontSize: 12, color: '#15803D', fontWeight: 700, background: '#DCFCE7', padding: '5px 10px', borderRadius: 8 }}>
                            ✓ Ref: {req.paymentRef}
                          </div>
                        )}

                        {isRejected && req.rejectionReason && (
                          <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 700, background: '#FEE2E2', padding: '5px 10px', borderRadius: 8 }}>
                            {req.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bank / Payment Account Details for Otman to execute wire */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(0,0,0,0.06)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                          {bankName} ({req.method?.toUpperCase()}):
                        </div>
                        {accountHolder && (
                          <div style={{ fontSize: 12.5, color: '#0F172A' }}>
                            <strong>{accountHolder}</strong>
                          </div>
                        )}
                      </div>

                      {/* RIB / IBAN */}
                      {rib && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            borderRadius: 8,
                            padding: '8px 12px',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>🏦</span>
                            <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                              {rib}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748B' }}>({bankName})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(rib, req.id + '_rib')}
                            style={{
                              background: copiedId === req.id + '_rib' ? '#10B981' : '#0F172A',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '5px 10px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedId === req.id + '_rib' ? '✓' : tUI.copyRib}
                          </button>
                        </div>
                      )}

                      {/* PayPal Email */}
                      {paypal && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            borderRadius: 8,
                            padding: '8px 12px',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>🅿️</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0369A1' }}>
                              {paypal}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(paypal, req.id + '_paypal')}
                              style={{
                                background: copiedId === req.id + '_paypal' ? '#10B981' : '#0284C7',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                padding: '5px 10px',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {copiedId === req.id + '_paypal' ? '✓' : tUI.copyEmail}
                            </button>
                            <a
                              href={`https://www.paypal.com/myaccount/transfer/homepage/send`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#0F172A',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: 6,
                                padding: '5px 10px',
                                fontSize: 11.5,
                                fontWeight: 700,
                              }}
                            >
                              PayPal ↗
                            </a>
                          </div>
                        </div>
                      )}

                      {/* CashPlus CIN */}
                      {cin && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#FFF7ED',
                            border: '1px solid #FFEDD5',
                            borderRadius: 8,
                            padding: '8px 12px',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14 }}>🆔</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#C2410C' }}>
                              CIN: {cin}
                            </span>
                            <span style={{ fontSize: 12, color: '#7C2D12' }}>- {accountHolder}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(cin, req.id + '_cin')}
                            style={{
                              background: copiedId === req.id + '_cin' ? '#10B981' : '#EA580C',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '5px 10px',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedId === req.id + '_cin' ? '✓' : tUI.copyCin}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CREATORS & USERS */}
      {activeSubTab === 'users' && (
        <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                {tUI.tabUsers}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                {language === 'ar'
                  ? 'عرض جميع المستخدمين، مبيعاتهم، المنتجات الرقمية التي أنشأوها، وعمولة المنصة 9% المحققة منهم.'
                  : 'Liste des créateurs, ventes brutes en €, commissions 9% et soldes disponibles.'}
              </p>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '6px 14px', borderRadius: 10 }}>
              Total: {filteredUsers.length}
            </div>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tUI.searchUsers}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              outline: 'none',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {filteredUsers.map((u) => {
              const wa = u.whatsapp ? u.whatsapp.replace(/[^0-9+]/g, '') : null
              return (
                <div
                  key={u.username}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 16,
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background: '#0F172A',
                          color: '#14B8A6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          fontWeight: 800,
                        }}
                      >
                        {u.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>
                          @{u.username}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {u.email || 'Email non renseigné'}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`/u/${u.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#0F172A',
                        textDecoration: 'none',
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 8,
                      }}
                    >
                      {tUI.visitProfile}
                    </a>
                  </div>

                  {/* Financial Metrics of User in EUR (€) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{tUI.productsCount}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{u.productsCount || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Ventes</div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>{formatMoney(u.totalGross || 0).main}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#0D9488' }}>9% Frais</div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0D9488' }}>{formatMoney(u.platformFee9Percent || 0).main}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748B' }}>
                    <div>
                      {tUI.balanceRemaining} <strong>{formatMoney(u.availableBalance || 0).main}</strong> <span style={{ fontSize: 11 }}>({formatMoney(u.availableBalance || 0).sub})</span>
                    </div>
                    {wa && (
                      <a
                        href={`https://wa.me/${wa.replace('+', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#25D366', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>💬</span>
                        <span>{u.whatsapp}</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: ALL ORDERS & DATA */}
      {activeSubTab === 'orders' && (
        <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                {tUI.tabOrders}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
                {language === 'ar'
                  ? 'سجل المبيعات بالكامل مع عمولة الـ 9% وبيانات المشتري وطريقة الدفع.'
                  : 'Registre des transactions avec détail des 9% de frais et coordonnées des clients.'}
              </p>
            </div>

            <button
              type="button"
              onClick={exportOrdersCSV}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tUI.exportOrders}
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tUI.searchOrders}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              outline: 'none',
              textAlign: isRTL ? 'right' : 'left',
            }}
          />

          {filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛍️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
                {language === 'ar' ? 'لا توجد معاملات تطابق البحث' : 'Aucune commande trouvée'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>Produit / Date</th>
                    <th style={{ padding: '10px 12px' }}>Vendeur</th>
                    <th style={{ padding: '10px 12px' }}>Client</th>
                    <th style={{ padding: '10px 12px' }}>Total Brut ({adminCurrency === 'EUR' ? '€' : 'DH'})</th>
                    <th style={{ padding: '10px 12px' }}>9% Plateforme</th>
                    <th style={{ padding: '10px 12px' }}>Net Vendeur (91%)</th>
                    <th style={{ padding: '10px 12px' }}>Paiement</th>
                    <th style={{ padding: '10px 12px' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((tx) => {
                    const isCompleted = tx.status === 'completed' || !tx.status
                    const grossDh = Number(tx.grossAmount) || 0
                    const feeDh = Number(tx.platformFee) || Math.round(grossDh * 0.09 * 100) / 100
                    const netDh = Number(tx.sellerNet) || Math.round(grossDh * 0.91 * 100) / 100

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{tx.productName || 'Digital Product'}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('fr-FR') : tx.id}</div>
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 700, color: '#0D9488' }}>
                          @{tx.sellerUsername}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{tx.customerName || 'Client'}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{tx.customerEmail || tx.customerPhone || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 800, color: '#0F172A' }}>
                          <div>{formatMoney(grossDh).main}</div>
                          <div style={{ fontSize: 10.5, color: '#94A3B8' }}>({formatMoney(grossDh).sub})</div>
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 800, color: '#10B981' }}>
                          <div>+{formatMoney(feeDh).main}</div>
                        </td>
                        <td style={{ padding: '12px 12px', color: '#475569' }}>
                          <div>{formatMoney(netDh).main}</div>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            {tx.method || 'card'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          {isCompleted ? (
                            <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100 }}>
                              ✓ Payé
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOrderConfirm(tx.id)}
                              style={{
                                background: '#F59E0B',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Valider ✓
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: REVENUE ANALYTICS & EXPORTS */}
      {activeSubTab === 'revenue' && (
        <div dir={isRTL ? 'rtl' : 'ltr'} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              {tUI.tabRevenue}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
              {language === 'ar'
                ? 'شرح كامل لآلية حساب وتوزيع أموال المنصة مع أزرار تصدير التقارير المالية باليورو والدرهم.'
                : 'Synthèse des revenus plateforme (9%) et outils d\'exportation comptable CSV.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>{tUI.profit9}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#047857', marginTop: 6 }}>
                {formatMoney(data.financials.totalFees9Percent || 0).main}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#166534' }}>
                ≈ {formatMoney(data.financials.totalFees9Percent || 0).sub} ({tUI.profitSub})
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                {language === 'ar' ? 'مستحقات البائعين الكلية (91%)' : 'Total Net Vendeurs (91%)'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 6 }}>
                {formatMoney(data.financials.totalSellerNet91Percent || 0).main}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748B' }}>
                Payé: {formatMoney(data.financials.totalPaidOut || 0).main} · En attente: {formatMoney(data.financials.pendingWithdrawalsAmount || 0).main}
              </p>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                {language === 'ar' ? 'تصدير التقارير الشاملة' : 'Exportation des Rapports'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={exportWithdrawalsCSV}
                  style={{
                    background: '#0F172A',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {tUI.exportWithdrawals}
                </button>
                <button
                  type="button"
                  onClick={exportOrdersCSV}
                  style={{
                    background: '#0D9488',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {tUI.exportOrders}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE PAYOUT MODAL */}
      {approveModalOpen && selectedPayout && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                {tUI.modalApproveTitle}
              </h3>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 14, color: '#166534', fontWeight: 800 }}>
                {tUI.modalApproveAmount} {formatMoney(selectedPayout.amount).main} <span style={{ fontSize: 12, fontWeight: 600 }}>({formatMoney(selectedPayout.amount).sub})</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#15803D', marginTop: 4 }}>
                @{selectedPayout.creatorUsername}
              </div>
              {selectedPayout.details?.rib && (
                <div style={{ fontSize: 12, color: '#166534', marginTop: 4, fontFamily: 'monospace' }}>
                  RIB: {selectedPayout.details.rib}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {tUI.refLabel}
              </label>
              <input
                type="text"
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                placeholder={tUI.refPlaceholder}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                {tUI.notesLabel}
              </label>
              <textarea
                value={actionNotesInput}
                onChange={(e) => setActionNotesInput(e.target.value)}
                placeholder={tUI.notesPlaceholder}
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'none',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                style={{
                  flex: 1,
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                {tUI.cancel}
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handlePayoutAction('approve')}
                style={{
                  flex: 2,
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {submittingAction ? '...' : tUI.confirmApprove}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PAYOUT MODAL */}
      {rejectModalOpen && selectedPayout && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#DC2626' }}>
              {tUI.modalRejectTitle}
            </h3>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748B' }}>
              {tUI.modalRejectDesc}
            </p>

            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder={tUI.rejectPlaceholder}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                outline: 'none',
                textAlign: isRTL ? 'right' : 'left',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                style={{
                  flex: 1,
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                {tUI.cancel}
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() => handlePayoutAction('reject')}
                style={{
                  flex: 1,
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {submittingAction ? '...' : tUI.confirmReject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
