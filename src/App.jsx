import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Costanti
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'alimentari','casa','trasporti','salute','istruzione',
  'abbigliamento','svago','ristorante','utenze','assicurazioni','altro',
]

const CATEGORY_ICONS = {
  alimentari:'🛒', casa:'🏠', trasporti:'🚗', salute:'💊',
  istruzione:'📚', abbigliamento:'👕', svago:'🎭', ristorante:'🍽️',
  utenze:'💡', assicurazioni:'🛡️', altro:'📦',
}

const CATEGORY_COLORS = [
  '#C4622D','#1E3A5F','#C9972A','#5A7A5C','#7B5EA7',
  '#2A8A9A','#D45F6A','#4A7A5A','#8A6A3A','#4A5A8A','#8A8A8A',
]

const SPLIT_MODES = [
  { value:'equal_adults',  label:'50/50 Gianni & Claudia' },
  { value:'gianni_only',   label:'Solo Gianni' },
  { value:'claudia_only',  label:'Solo Claudia' },
  { value:'custom',        label:'Personalizzata' },
]

const FAMILY_NAMES = ['Gianni','Claudia','Virginia']

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const euro = (n) =>
  new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR' }).format(n ?? 0)

const todayISO = () => new Date().toISOString().slice(0, 10)
const currentMonthKey = () => new Date().toISOString().slice(0, 7)
const monthLabel  = (key) => new Date(key + '-02').toLocaleDateString('it-IT', { month:'long', year:'numeric' })
const monthShort  = (key) => new Date(key + '-02').toLocaleDateString('it-IT', { month:'short', year:'2-digit' })

function getResponsibility(expense) {
  const amt = Number(expense.amount)
  switch (expense.split_mode) {
    case 'gianni_only':  return { gianni:amt, claudia:0 }
    case 'claudia_only': return { gianni:0, claudia:amt }
    case 'custom': {
      const g = Number(expense.custom_gianni_pct ?? 50) / 100
      return { gianni:amt*g, claudia:amt*(1-g) }
    }
    default: return { gianni:amt/2, claudia:amt/2 }
  }
}

function lastNMonths(allMonthKeys, n=8) {
  return [...new Set(allMonthKeys)].sort().slice(-n)
}

const blankForm = () => ({
  expense_date:      todayISO(),
  category:          'alimentari',
  description:       '',
  amount:            '',
  payer:             'Gianni',
  split_mode:        'equal_adults',
  custom_gianni_pct: '50',
  beneficiaries:     ['Gianni','Claudia','Virginia'],
})

// ─────────────────────────────────────────────────────────────────────────────
// LoginScreen
// ─────────────────────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error:err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (err) setError(err.message); else setSent(true)
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-icon">🏡</span>
          <h1 className="login-title">Virginia<br/>Home Budget</h1>
          <p className="login-sub">Spese di famiglia, chiare e condivise</p>
        </div>
        {sent ? (
          <div className="login-sent">
            <div className="sent-icon">✉️</div>
            <h2>Controlla la mail</h2>
            <p>Link inviato a <strong>{email}</strong>. Clicca per entrare.</p>
            <button className="btn-ghost" onClick={() => setSent(false)}>Usa un'altra email</button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field-label">La tua email</label>
            <input className="field-input" type="email" placeholder="gianni@esempio.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Invio…' : 'Invia link di accesso'}
            </button>
            <p className="login-note">Niente password. Ricevi un link sicuro via email.</p>
          </form>
        )}
      </div>
      <div className="login-decoration" aria-hidden>
        <div className="deco-circle deco-1"/>
        <div className="deco-circle deco-2"/>
        <div className="deco-circle deco-3"/>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivateScreen
// ─────────────────────────────────────────────────────────────────────────────

function ActivateScreen({ session, onActivated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const activate = async () => {
    setLoading(true); setError('')
    const { data:match, error:err } = await supabase
      .from('family_users').select('id').eq('allowed_email', session.user.email).is('user_id', null).single()
    if (err || !match) { setError("Email non autorizzata o già attivata."); setLoading(false); return }
    const { error:upErr } = await supabase.from('family_users').update({ user_id:session.user.id }).eq('id', match.id)
    if (upErr) { setError(upErr.message); setLoading(false); return }
    setLoading(false); onActivated()
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-icon">🔑</span>
          <h1 className="login-title">Attiva<br/>l'accesso</h1>
          <p className="login-sub">{session.user.email}</p>
        </div>
        <div className="activate-body">
          <p>Clicca per collegare questo account al tuo profilo famiglia.</p>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn-primary" onClick={activate} disabled={loading}>
            {loading ? 'Attivazione…' : 'Attiva accesso'}
          </button>
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Esci</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseForm — condiviso tra inserimento e modifica
// ─────────────────────────────────────────────────────────────────────────────

function ExpenseForm({ initialValues, familyUser, session, onSaved, onCancel, submitLabel='Salva spesa' }) {
  const [form, setForm]         = useState(initialValues ?? blankForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  const setField = (k, v) => setForm(f => ({ ...f, [k]:v }))

  const toggleBeneficiary = (name) =>
    setForm(f => ({
      ...f,
      beneficiaries: f.beneficiaries.includes(name)
        ? f.beneficiaries.filter(n => n !== name)
        : [...f.beneficiaries, name],
    }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.amount || Number(form.amount) <= 0) { setError('Inserisci un importo valido.'); return }
    if (!form.beneficiaries.length) { setError('Seleziona almeno un beneficiario.'); return }
    setSubmitting(true)

    const { data:payerRow } = await supabase.from('family_users')
      .select('user_id').eq('family_id', familyUser.family_id).eq('display_name', form.payer).single()
    const payerUserId = payerRow?.user_id ?? session.user.id

    const payload = {
      family_id:         familyUser.family_id,
      payer_user_id:     payerUserId,
      payer_name:        form.payer,
      expense_date:      form.expense_date,
      month_key:         form.expense_date.slice(0,7),
      category:          form.category,
      description:       form.description || null,
      amount:            Number(form.amount),
      split_mode:        form.split_mode,
      custom_gianni_pct: form.split_mode === 'custom' ? Number(form.custom_gianni_pct) : null,
      beneficiaries:     form.beneficiaries,
    }

    let dbError
    if (form.id) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', form.id)
      dbError = error
    } else {
      const { error } = await supabase.from('expenses').insert(payload)
      dbError = error
    }

    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }
    onSaved?.()
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label className="field-label">Data</label>
          <input className="field-input" type="date" value={form.expense_date}
            onChange={e => setField('expense_date', e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">Importo (€)</label>
          <input className="field-input" type="number" min="0.01" step="0.01" placeholder="0,00"
            value={form.amount} onChange={e => setField('amount', e.target.value)} required />
        </div>
        <div className="field">
          <label className="field-label">Categoria</label>
          <select className="field-input" value={form.category}
            onChange={e => setField('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Chi ha pagato</label>
          <select className="field-input" value={form.payer}
            onChange={e => setField('payer', e.target.value)}>
            <option value="Gianni">Gianni</option>
            <option value="Claudia">Claudia</option>
          </select>
        </div>
      </div>

      <div className="field full-width">
        <label className="field-label">Descrizione (opzionale)</label>
        <input className="field-input" type="text" placeholder="es. Spesa Esselunga, bolletta luce…"
          value={form.description} onChange={e => setField('description', e.target.value)} />
      </div>

      <div className="field full-width">
        <label className="field-label">Ripartizione</label>
        <div className="split-options">
          {SPLIT_MODES.map(s => (
            <label key={s.value} className={`split-radio${form.split_mode === s.value ? ' selected':''}`}>
              <input type="radio" name={`split_mode_${form.id || 'new'}`} value={s.value}
                checked={form.split_mode === s.value} onChange={() => setField('split_mode', s.value)} />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      {form.split_mode === 'custom' && (
        <div className="field">
          <label className="field-label">% Gianni — {form.custom_gianni_pct}%</label>
          <input className="field-input" type="range" min="0" max="100"
            value={form.custom_gianni_pct} onChange={e => setField('custom_gianni_pct', e.target.value)} />
          <div className="split-preview">
            Gianni {form.custom_gianni_pct}% · Claudia {100-Number(form.custom_gianni_pct)}%
            {form.amount && (
              <> → {euro(Number(form.amount)*Number(form.custom_gianni_pct)/100)} / {euro(Number(form.amount)*(100-Number(form.custom_gianni_pct))/100)}</>
            )}
          </div>
        </div>
      )}

      <div className="field full-width">
        <label className="field-label">Beneficiari</label>
        <div className="chips-row">
          {FAMILY_NAMES.map(name => (
            <button key={name} type="button"
              className={`chip${form.beneficiaries.includes(name)?' chip-on':''}`}
              onClick={() => toggleBeneficiary(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Salvataggio…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>Annulla</button>
        )}
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EditModal
// ─────────────────────────────────────────────────────────────────────────────

function EditModal({ expense, familyUser, session, onSaved, onClose }) {
  const overlayRef = useRef()

  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose() }

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const initialValues = {
    id:                expense.id,
    expense_date:      expense.expense_date,
    category:          expense.category,
    description:       expense.description ?? '',
    amount:            String(expense.amount),
    payer:             expense.payer_name ?? 'Gianni',
    split_mode:        expense.split_mode,
    custom_gianni_pct: String(expense.custom_gianni_pct ?? 50),
    beneficiaries:     Array.isArray(expense.beneficiaries) ? expense.beneficiaries : [],
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlay} role="dialog" aria-modal="true" aria-label="Modifica spesa">
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">✏️ Modifica spesa</h2>
          <button className="modal-close" onClick={onClose} aria-label="Chiudi">×</button>
        </div>
        <div className="modal-body">
          <ExpenseForm
            initialValues={initialValues}
            familyUser={familyUser}
            session={session}
            onSaved={() => { onSaved(); onClose() }}
            onCancel={onClose}
            submitLabel="Aggiorna spesa"
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseCard
// ─────────────────────────────────────────────────────────────────────────────

function ExpenseCard({ expense, onDelete, onEdit }) {
  const r = getResponsibility(expense)
  return (
    <div className="expense-card">
      <div className="expense-header">
        <div className="expense-cat-icon">{CATEGORY_ICONS[expense.category] || '📦'}</div>
        <div className="expense-info">
          <div className="expense-title">{expense.description || expense.category}</div>
          <div className="expense-meta">{expense.expense_date} · {expense.category}</div>
          <div className="expense-meta">Pagata da <strong>{expense.payer_name}</strong></div>
        </div>
        <div className="expense-right">
          <div className="expense-amount">{euro(expense.amount)}</div>
          <div className="expense-card-btns">
            <button className="btn-edit" onClick={() => onEdit(expense)} title="Modifica">✏️</button>
            <button className="btn-delete" onClick={() => onDelete(expense.id)} title="Elimina">×</button>
          </div>
        </div>
      </div>
      <div className="expense-split">
        <span className="split-pill gianni">G {euro(r.gianni)}</span>
        <span className="split-pill claudia">C {euro(r.claudia)}</span>
        {(expense.beneficiaries || []).map(name => (
          <span key={name} className="chip-member">{name}</span>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, sub }) {
  return (
    <div className={`stat-card${accent ? ' stat-accent-'+accent : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BarChart — SVG stacked bars Gianni + Claudia
// ─────────────────────────────────────────────────────────────────────────────

function BarChart({ data, height = 200 }) {
  if (!data.length) return <p className="muted">Nessun dato.</p>

  const maxVal = Math.max(...data.map(d => d.gianni + d.claudia), 1)
  const barW   = 34
  const gap    = 14
  const padL   = 52
  const padB   = 36
  const padT   = 16
  const chartH = height - padB - padT
  const totalW = padL + data.length * (barW + gap) + 16

  const Y_LINES = 4

  return (
    <svg viewBox={`0 0 ${totalW} ${height}`} className="bar-chart-svg"
      style={{ width:'100%', maxHeight: height + 'px' }}
      role="img" aria-label="Grafico spesa mensile">

      {/* Y grid + labels */}
      {Array.from({ length: Y_LINES+1 }, (_,i) => {
        const y   = padT + chartH - (i/Y_LINES)*chartH
        const val = (i/Y_LINES)*maxVal
        return (
          <g key={i}>
            <line x1={padL-4} x2={totalW-8} y1={y} y2={y}
              stroke="#E5DDD0" strokeWidth={i===0?1.5:1} strokeDasharray={i===0?'':'4 3'} />
            <text x={padL-8} y={y+4} textAnchor="end" fontSize="9" fill="#B5AFA8" fontFamily="inherit">
              {val>=1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val)}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x     = padL + i*(barW+gap)
        const total = d.gianni + d.claudia
        const totH  = (total/maxVal)*chartH
        const gH    = (d.gianni/maxVal)*chartH
        const cH    = (d.claudia/maxVal)*chartH
        const mid   = x + barW/2
        const yBase = padT + chartH

        return (
          <g key={i}>
            {/* Claudia segment (bottom) */}
            {cH > 0 && (
              <rect x={x} y={yBase-totH} width={barW} height={cH}
                fill="#2D5080" rx="3" opacity="0.82" />
            )}
            {/* Gianni segment (top) */}
            {gH > 0 && (
              <rect x={x} y={yBase-totH+cH} width={barW} height={gH}
                fill="#C4622D" rx="3" opacity="0.9" />
            )}
            {/* Total label */}
            {total > 0 && (
              <text x={mid} y={yBase-totH-5} textAnchor="middle"
                fontSize="8.5" fill="#4A3F36" fontWeight="700" fontFamily="inherit">
                {total>=1000 ? `${(total/1000).toFixed(1)}k` : Math.round(total)}
              </text>
            )}
            {/* X label */}
            <text x={mid} y={height-18} textAnchor="middle"
              fontSize="9" fill="#7A6E65" fontFamily="inherit">
              {d.label}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g>
        <rect x={padL} y={height-11} width={9} height={9} fill="#C4622D" rx="2" />
        <text x={padL+12} y={height-4} fontSize="9" fill="#4A3F36" fontFamily="inherit">Gianni</text>
        <rect x={padL+60} y={height-11} width={9} height={9} fill="#2D5080" rx="2" />
        <text x={padL+72} y={height-4} fontSize="9" fill="#4A3F36" fontFamily="inherit">Claudia</text>
      </g>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CategoryBarChart — horizontal bars
// ─────────────────────────────────────────────────────────────────────────────

function CategoryBarChart({ data, total }) {
  if (!data.length) return <p className="muted">Nessuna spesa registrata.</p>
  const max = data[0].amount
  return (
    <div className="cat-chart">
      {data.slice(0, 9).map((d, i) => {
        const pct   = total > 0 ? (d.amount/total)*100 : 0
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
        return (
          <div key={d.category} className="cat-chart-row">
            <div className="cat-chart-label">
              <span>{CATEGORY_ICONS[d.category]||'📦'}</span>
              <span className="cat-chart-name">{d.category}</span>
            </div>
            <div className="cat-chart-bar-wrap">
              <div className="cat-chart-bar-track">
                <div className="cat-chart-bar-fill"
                  style={{ width:`${(d.amount/max)*100}%`, background:color }} />
              </div>
              <span className="cat-chart-val">{euro(d.amount)}</span>
              <span className="cat-chart-pct">{pct.toFixed(1)}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChartsView
// ─────────────────────────────────────────────────────────────────────────────

function ChartsView({ expenses }) {
  const [chartRange, setChartRange] = useState(6)

  const allMonths = useMemo(() => {
    const m = [...new Set(expenses.map(e => e.month_key))].sort()
    if (!m.includes(currentMonthKey())) m.push(currentMonthKey())
    return m
  }, [expenses])

  const shownMonths  = useMemo(() => lastNMonths(allMonths, chartRange), [allMonths, chartRange])

  const monthlyData = useMemo(() =>
    shownMonths.map(mk => {
      let gianni=0, claudia=0
      expenses.filter(e => e.month_key===mk).forEach(e => {
        const r=getResponsibility(e); gianni+=r.gianni; claudia+=r.claudia
      })
      return { label:monthShort(mk), mk, gianni, claudia, total:gianni+claudia }
    })
  ,[expenses, shownMonths])

  const allCatData = useMemo(() => {
    const map = {}
    expenses.forEach(e => { map[e.category]=(map[e.category]??0)+Number(e.amount) })
    return Object.entries(map).map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount)
  }, [expenses])

  const allTotal  = useMemo(() => allCatData.reduce((s,d)=>s+d.amount,0), [allCatData])
  const totalG    = useMemo(() => expenses.reduce((s,e)=>s+getResponsibility(e).gianni,0), [expenses])
  const totalC    = useMemo(() => expenses.reduce((s,e)=>s+getResponsibility(e).claudia,0), [expenses])

  const trend = useMemo(() => {
    if (monthlyData.length < 2) return null
    const last = monthlyData[monthlyData.length-1].total
    const prev = monthlyData[monthlyData.length-2].total
    if (!prev) return null
    const pct = ((last-prev)/prev)*100
    return { pct, up: pct>0 }
  }, [monthlyData])

  if (!expenses.length) return (
    <div className="charts-empty">
      <div className="empty-icon">📈</div>
      <p>Aggiungi alcune spese per visualizzare i grafici storici.</p>
    </div>
  )

  return (
    <div className="charts-view">

      {/* KPI strip */}
      <div className="charts-kpi-row">
        <div className="kpi-tile">
          <div className="kpi-label">Totale registrato</div>
          <div className="kpi-value">{euro(allTotal)}</div>
        </div>
        <div className="kpi-tile kpi-g">
          <div className="kpi-label">Quota totale Gianni</div>
          <div className="kpi-value">{euro(totalG)}</div>
          <div className="kpi-sub">{allTotal>0?((totalG/allTotal)*100).toFixed(0):0}%</div>
        </div>
        <div className="kpi-tile kpi-c">
          <div className="kpi-label">Quota totale Claudia</div>
          <div className="kpi-value">{euro(totalC)}</div>
          <div className="kpi-sub">{allTotal>0?((totalC/allTotal)*100).toFixed(0):0}%</div>
        </div>
        {trend && (
          <div className={`kpi-tile kpi-trend ${trend.up?'up':'down'}`}>
            <div className="kpi-label">Variazione ultimo mese</div>
            <div className="kpi-value">{trend.up?'▲':'▼'} {Math.abs(trend.pct).toFixed(1)}%</div>
            <div className="kpi-sub">vs mese precedente</div>
          </div>
        )}
      </div>

      {/* Monthly bar chart */}
      <div className="panel charts-panel">
        <div className="charts-panel-header">
          <h2 className="panel-title" style={{margin:0}}>📊 Spesa mensile</h2>
          <div className="range-pills">
            {[3,6,12].map(n => (
              <button key={n} onClick={()=>setChartRange(n)}
                className={`range-pill${chartRange===n?' active':''}`}>
                {n} mesi
              </button>
            ))}
          </div>
        </div>

        <div className="bar-chart-wrap">
          <BarChart data={monthlyData} height={210} />
        </div>

        {/* Monthly detail table */}
        <div className="month-table">
          <table>
            <thead>
              <tr><th>Mese</th><th>Totale</th><th>Quota G</th><th>Quota C</th></tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map(d => (
                <tr key={d.mk}>
                  <td className="month-cell">{monthLabel(d.mk)}</td>
                  <td className="val-cell">{euro(d.total)}</td>
                  <td className="val-cell g-cell">{euro(d.gianni)}</td>
                  <td className="val-cell c-cell">{euro(d.claudia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="panel charts-panel">
        <h2 className="panel-title">🏷️ Categorie — storico completo</h2>
        <CategoryBarChart data={allCatData} total={allTotal} />
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [session,          setSession]          = useState(null)
  const [authLoading,      setAuthLoading]      = useState(true)
  const [familyUser,       setFamilyUser]       = useState(null)
  const [expenses,         setExpenses]         = useState([])
  const [dataLoading,      setDataLoading]      = useState(false)
  const [selectedMonth,    setSelectedMonth]    = useState(currentMonthKey())
  const [availableMonths,  setAvailableMonths]  = useState([currentMonthKey()])
  const [showForm,         setShowForm]         = useState(false)
  const [editingExpense,   setEditingExpense]   = useState(null)
  const [activeView,       setActiveView]       = useState('month') // 'month' | 'charts'

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{session:s} }) => {
      setSession(s); setAuthLoading(false)
    })
    const { data:{subscription} } = supabase.auth.onAuthStateChange((_e,s) => {
      setSession(s); setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Family user ───────────────────────────────────────────────────────────
  const loadFamilyUser = useCallback(async () => {
    if (!session) { setFamilyUser(null); return }
    const { data } = await supabase.from('family_users')
      .select('id,family_id,display_name,user_id')
      .eq('user_id', session.user.id).single()
    setFamilyUser(data ?? null)
  }, [session])

  useEffect(() => { loadFamilyUser() }, [loadFamilyUser])

  // ── Expenses ──────────────────────────────────────────────────────────────
  const loadExpenses = useCallback(async () => {
    if (!familyUser) return
    setDataLoading(true)
    const { data } = await supabase.from('expenses')
      .select(`id,family_id,payer_user_id,expense_date,month_key,
               category,description,amount,split_mode,custom_gianni_pct,
               beneficiaries,created_at,
               family_users!expenses_payer_user_id_fkey(display_name)`)
      .eq('family_id', familyUser.family_id)
      .order('expense_date', { ascending:false })

    const enriched = (data??[]).map(e => ({ ...e, payer_name: e.family_users?.display_name ?? '?' }))
    setExpenses(enriched)

    const months = [...new Set(enriched.map(e=>e.month_key))].sort().reverse()
    if (months.length) {
      if (!months.includes(currentMonthKey())) months.unshift(currentMonthKey())
      setAvailableMonths(months)
      setSelectedMonth(m => months.includes(m) ? m : months[0])
    }
    setDataLoading(false)
  }, [familyUser])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyUser) return
    const ch = supabase.channel('expenses-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'expenses' }, loadExpenses)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [familyUser, loadExpenses])

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteExpense = useCallback(async (id) => {
    if (!confirm('Eliminare questa spesa?')) return
    await supabase.from('expenses').delete().eq('id', id)
    loadExpenses()
  }, [loadExpenses])

  // ── Derived ───────────────────────────────────────────────────────────────
  const visibleExpenses = useMemo(
    () => expenses.filter(e => e.month_key === selectedMonth),
    [expenses, selectedMonth]
  )

  const stats = useMemo(() => {
    let totalAll=0, gShare=0, cShare=0, gPaid=0, cPaid=0
    visibleExpenses.forEach(e => {
      const amt=Number(e.amount); totalAll+=amt
      const r=getResponsibility(e); gShare+=r.gianni; cShare+=r.claudia
      if (e.payer_name==='Gianni') gPaid+=amt
      if (e.payer_name==='Claudia') cPaid+=amt
    })
    const net = gShare - gPaid
    return { totalAll, gShare, cShare, gPaid, cPaid, net }
  }, [visibleExpenses])

  const categorySummary = useMemo(() => {
    const map = {}
    visibleExpenses.forEach(e => { map[e.category]=(map[e.category]??0)+Number(e.amount) })
    return Object.entries(map).map(([category,total])=>({category,total})).sort((a,b)=>b.total-a.total)
  }, [visibleExpenses])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="login-shell">
      <div className="login-card" style={{textAlign:'center',gap:16}}>
        <span style={{fontSize:48}}>🏡</span>
        <p style={{color:'#7A6E65'}}>Caricamento…</p>
      </div>
    </div>
  )
  if (!session)    return <LoginScreen />
  if (!familyUser) return <ActivateScreen session={session} onActivated={loadFamilyUser} />

  const balanceLabel = Math.abs(stats.net) < 0.005
    ? '⚖️ In pareggio'
    : stats.net > 0
      ? `Gianni deve ${euro(stats.net)} a Claudia`
      : `Claudia deve ${euro(Math.abs(stats.net))} a Gianni`

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-icon">🏡</span>
          <div>
            <div className="topbar-title">Virginia Home Budget</div>
            <div className="topbar-sub">Ciao, {familyUser.display_name} 👋</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="view-tabs">
            <button className={`view-tab${activeView==='month'?' active':''}`}
              onClick={()=>setActiveView('month')}>
              📋 Mensile
            </button>
            <button className={`view-tab${activeView==='charts'?' active':''}`}
              onClick={()=>setActiveView('charts')}>
              📈 Grafici
            </button>
          </div>
          <button className="btn-signout" onClick={()=>supabase.auth.signOut()}>Esci</button>
        </div>
      </header>

      {/* ── Month strip ── */}
      {activeView==='month' && (
        <div className="month-strip">
          {availableMonths.map(m => (
            <button key={m} onClick={()=>setSelectedMonth(m)}
              className={`month-pill${m===selectedMonth?' active':''}`}>
              {monthShort(m)}
            </button>
          ))}
        </div>
      )}

      {/* ── Charts view ── */}
      {activeView==='charts' && (
        <div className="content-wrap">
          <ChartsView expenses={expenses} />
        </div>
      )}

      {/* ── Month view ── */}
      {activeView==='month' && (
        <div className="content-wrap">

          <section className="stats-row">
            <StatCard label="Totale mese"    value={euro(stats.totalAll)} accent="total" />
            <StatCard label="Quota Gianni"   value={euro(stats.gShare)}   accent="gianni"  sub={`Pagato ${euro(stats.gPaid)}`} />
            <StatCard label="Quota Claudia"  value={euro(stats.cShare)}   accent="claudia" sub={`Pagato ${euro(stats.cPaid)}`} />
            <StatCard label="Saldo"          value={balanceLabel}
              accent={stats.net>0.005?'owe-g':stats.net<-0.005?'owe-c':'even'} />
          </section>

          <div className="add-row">
            <button className={`btn-add${showForm?' active':''}`}
              onClick={()=>setShowForm(v=>!v)}>
              {showForm ? '× Annulla' : '+ Aggiungi spesa'}
            </button>
          </div>

          {showForm && (
            <section className="form-panel">
              <h2 className="panel-title">Nuova spesa</h2>
              <ExpenseForm
                familyUser={familyUser}
                session={session}
                onSaved={()=>{ loadExpenses(); setShowForm(false) }}
                onCancel={()=>setShowForm(false)}
                submitLabel="Salva spesa"
              />
            </section>
          )}

          <div className="main-grid">
            <section className="panel">
              <h2 className="panel-title">
                Spese — {monthLabel(selectedMonth)}
                {dataLoading && <span className="loading-dot">…</span>}
              </h2>
              {visibleExpenses.length===0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🧾</div>
                  <p>Nessuna spesa per {monthLabel(selectedMonth)}.</p>
                </div>
              ) : (
                <div className="expense-list">
                  {visibleExpenses.map(expense => (
                    <ExpenseCard key={expense.id} expense={expense}
                      onDelete={deleteExpense} onEdit={setEditingExpense} />
                  ))}
                </div>
              )}
            </section>

            <aside className="sidebar">
              <section className="panel">
                <h2 className="panel-title">Per categoria</h2>
                {categorySummary.length===0 ? (
                  <p className="muted">Nessuna spesa.</p>
                ) : (
                  <div className="cat-list">
                    {categorySummary.map(item => {
                      const pct = stats.totalAll>0 ? (item.total/stats.totalAll)*100 : 0
                      return (
                        <div key={item.category} className="cat-row">
                          <div className="cat-row-top">
                            <span className="cat-name">{CATEGORY_ICONS[item.category]} {item.category}</span>
                            <span className="cat-amount">{euro(item.total)}</span>
                          </div>
                          <div className="cat-bar-track">
                            <div className="cat-bar-fill" style={{width:`${pct}%`}} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="panel balance-panel">
                <h2 className="panel-title">Riepilogo pagamenti</h2>
                <div className="balance-row"><span>Gianni ha pagato</span><strong>{euro(stats.gPaid)}</strong></div>
                <div className="balance-row"><span>Claudia ha pagato</span><strong>{euro(stats.cPaid)}</strong></div>
                <div className="balance-row"><span>Quota Gianni</span><strong>{euro(stats.gShare)}</strong></div>
                <div className="balance-row"><span>Quota Claudia</span><strong>{euro(stats.cShare)}</strong></div>
                <div className="balance-verdict">{balanceLabel}</div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingExpense && (
        <EditModal
          expense={editingExpense}
          familyUser={familyUser}
          session={session}
          onSaved={loadExpenses}
          onClose={()=>setEditingExpense(null)}
        />
      )}
    </div>
  )
}
