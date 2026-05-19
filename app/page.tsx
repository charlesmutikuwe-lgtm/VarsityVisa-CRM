'use client'
// app/page.tsx — Public Study Match Form (Lead Capture)
import { useState } from 'react'
import { GraduationCap, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import type { StudyMatchFormData } from '@/types'
import { DESTINATIONS, destinationLabel } from '@/lib/constants'

const STEPS = ['Personal Info', 'Study Goals', 'Preferences', 'Contact']

const STUDY_LEVELS = [
  { value: 'undergraduate', label: 'Undergraduate Degree' },
  { value: 'postgraduate', label: 'Postgraduate / Masters' },
  { value: 'phd', label: 'PhD / Doctorate' },
  { value: 'diploma', label: 'Diploma / Certificate' },
  { value: 'short_course', label: 'Short Course' },
  { value: 'language', label: 'Language Programme' },
]

const BUDGETS = [
  { value: 'scholarship_only', label: '🎓 Scholarship Only', desc: 'I need full funding' },
  { value: 'under_2k', label: 'Under $2,000/yr', desc: 'Very limited budget' },
  { value: '2k_5k', label: '$2,000–$5,000/yr', desc: 'Low-cost destinations' },
  { value: 'under_5k', label: 'Under $5,000/yr', desc: 'Budget-sensitive' },
  { value: '5k_10k', label: '$5,000–$10,000/yr', desc: 'Budget programmes' },
  { value: '10k_20k', label: '$10,000–$20,000/yr', desc: 'Mid-range options' },
  { value: '20k_30k', label: '$20,000–$30,000/yr', desc: 'Most destinations' },
  { value: 'over_30k', label: 'Over $30,000/yr', desc: 'Premium institutions' },
]

const START_DATES = [
  { value: '2026-01', label: 'January 2026' },
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2027-01', label: 'January 2027' },
  { value: '2027-09', label: 'September 2027' },
]

const ZIMBABWE_CITIES = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi', 'Other']

const emptyForm: StudyMatchFormData = {
  full_name: '', email: '', phone: '', city: 'Harare',
  desired_destination: 'poland' as any,
  study_level: 'undergraduate' as any,
  field_of_study: '',
  intended_start_date: '2026-01',
  budget_range: '2k_5k' as any,
  has_passport: false,
  has_english_test: false,
  whatsapp_opt_in: true,
}

export default function StudyMatchPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<StudyMatchFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)

  const set = (key: keyof StudyMatchFormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const isValidPhone = /^(\+?263|0)?7[1378]\d{7}$/.test(form.phone.replace(/[\s-]/g, '')) || form.phone.replace(/\D/g, '').length >= 9
  const hasFullName = form.full_name.trim().split(/\s+/).length >= 2
  const canContinue =
    (step === 0 ? hasFullName && isValidEmail && isValidPhone : true) &&
    (step === 2 ? form.field_of_study.trim().length >= 2 : true)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      setScore(data.score)
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return <SuccessScreen score={score} name={form.full_name} destination={form.desired_destination} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4"
      style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.12) 0%, #0a0a0f 60%)' }}>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full text-xs font-medium"
          style={{ background: 'rgba(108,99,255,0.15)', color: '#a78bfa', border: '1px solid rgba(108,99,255,0.3)' }}>
          <GraduationCap size={13} />
          Free Consultation · No Obligation
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Find Your Perfect <span style={{ color: 'var(--brand-primary)' }}>Study Path</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
          Tell us about your goals and we'll match you with the best university programmes and visa pathway.
        </p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: i <= step ? 'var(--brand-primary)' : 'var(--surface-3)',
                  color: i <= step ? 'white' : 'var(--text-muted)',
                }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: i === step ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1 rounded-full" style={{ background: 'var(--surface-3)' }}>
          <div className="h-1 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: 'var(--brand-primary)' }} />
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-lg card animate-fade-in" style={{ padding: 28, borderColor: 'var(--border-default)' }}>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4">Personal Information</h2>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
              <input className="input-base" placeholder="e.g. Tatenda Moyo"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email Address *</label>
              <input className="input-base" type="email" placeholder="your@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone Number *</label>
              <input className="input-base" type="tel" placeholder="+263 77 123 4567"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>City</label>
              <select className="input-base" value={form.city} onChange={e => set('city', e.target.value)}>
                {ZIMBABWE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold mb-4">Study Goals</h2>
            <div>
              <label className="block text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Where do you want to study?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DESTINATIONS.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => set('desired_destination', d.value)}
                    className="text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      background: form.desired_destination === d.value ? 'var(--brand-primary)' : 'var(--surface-2)',
                      border: `1px solid ${form.desired_destination === d.value ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                      color: form.desired_destination === d.value ? 'white' : 'var(--text-secondary)',
                    }}>
                    {d.label}
                    {d.popular && <span className="ml-1 text-xs opacity-60">★</span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Study Level</label>
              <div className="space-y-2">
                {STUDY_LEVELS.map(l => (
                  <button key={l.value} type="button"
                    onClick={() => set('study_level', l.value)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      background: form.study_level === l.value ? 'rgba(108,99,255,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${form.study_level === l.value ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                      color: form.study_level === l.value ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold mb-4">Study Preferences</h2>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Field of Study *
              </label>
              <input className="input-base" placeholder="e.g. Computer Science, Business, Medicine"
                value={form.field_of_study} onChange={e => set('field_of_study', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                Intended Start Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                {START_DATES.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => set('intended_start_date', d.value)}
                    className="text-left px-3 py-2 rounded-lg text-sm transition-all"
                    style={{
                      background: form.intended_start_date === d.value ? 'rgba(108,99,255,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${form.intended_start_date === d.value ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                      color: form.intended_start_date === d.value ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Annual Budget</label>
              <div className="space-y-2">
                {BUDGETS.map(b => (
                  <button key={b.value} type="button"
                    onClick={() => set('budget_range', b.value)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      background: form.budget_range === b.value ? 'rgba(108,99,255,0.15)' : 'var(--surface-2)',
                      border: `1px solid ${form.budget_range === b.value ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                    }}>
                    <span style={{ color: form.budget_range === b.value ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                      {b.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{b.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold mb-4">Final Details</h2>
            <div className="space-y-3">
              {[
                { key: 'has_passport', label: '✅ I have a valid passport', desc: 'Essential for all applications' },
                { key: 'has_english_test', label: '📝 I have an English test result', desc: 'IELTS, TOEFL, Duolingo' },
                { key: 'whatsapp_opt_in', label: '📱 Contact me via WhatsApp', desc: 'Faster updates on your application' },
              ].map(item => (
                <button key={item.key} type="button"
                  onClick={() => set(item.key as any, !(form as any)[item.key])}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                  style={{
                    background: (form as any)[item.key] ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)',
                    border: `1px solid ${(form as any)[item.key] ? '#10b981' : 'var(--border-default)'}`,
                  }}>
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: (form as any)[item.key] ? '#10b981' : 'var(--surface-3)' }}>
                    {(form as any)[item.key] && <CheckCircle size={14} color="white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>YOUR STUDY MATCH SUMMARY</p>
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Name:</span> {form.full_name}</p>
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Destination:</span> {destinationLabel(form.desired_destination)}</p>
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Level:</span> {form.study_level}</p>
              <p className="text-sm"><span style={{ color: 'var(--text-muted)' }}>Field:</span> {form.field_of_study}</p>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              By submitting, you agree to be contacted by a Varsity Visa consultant.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary">
              <ArrowLeft size={15} /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="btn-primary"
              disabled={!canContinue}>
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Submitting…' : 'Get My Match'} 🎓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({ score, name, destination }: { score: number | null; name: string; destination: string }) {
  const firstName = name.split(' ')[0]
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.15) 0%, #0a0a0f 60%)' }}>
      <div className="text-center max-w-sm animate-fade-in">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="text-2xl font-bold mb-2">You're All Set, {firstName}!</h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Your study match profile has been submitted. A Varsity Visa consultant will contact you within 24 hours.
        </p>
        {score !== null && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid #10b98133' }}>
            ✨ Profile Score: {score}/100
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Want to speak to us now? Call or WhatsApp{' '}
          <a href="https://wa.me/263775050990" style={{ color: 'var(--brand-primary)' }}>+263 775 050 990</a>
        </p>
      </div>
    </div>
  )
}
