import { useApp } from '../store';
import { consentText } from './consent';
import './legal.css';

/** The withdrawal-waiver checkbox (text and rationale in ./consent.ts). */
export function WithdrawalConsent({ checked, onChange, need = false }: { checked: boolean; onChange: (v: boolean) => void; need?: boolean }) {
  const { lang, t } = useApp();
  const s = consentText(lang);
  return (
    <div>
      <label className={`wconsent ${need && !checked ? 'need' : ''}`}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-describedby={need && !checked ? 'wneed' : undefined} />
        <span>{s.text} <a href={`/${lang}/terms`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}>{t.legal.terms}</a></span>
      </label>
      {need && !checked && <div id="wneed" className="wneed" role="alert">{s.need}</div>}
    </div>
  );
}
