/** Small table glyphs: the barrel (with its 3 tries) and the bolt. */
export const Barrel = ({ tries = 0 }: { tries?: number }) => (
  <svg className="kbarrel" viewBox="0 0 20 22" aria-hidden>
    <path d="M4 2.5h12c1.6 2.4 2.4 5.2 2.4 8.5s-.8 6.1-2.4 8.5H4C2.4 17.1 1.6 14.3 1.6 11S2.4 4.9 4 2.5z" />
    <path className="hoop" d="M2.3 7h15.4M2.3 15h15.4" />
    {[0, 1, 2].map(i => <circle key={i} className={i < tries ? 'used' : ''} cx={6.5 + i * 3.5} cy={11} r={1.15} />)}
  </svg>
);
export const Bolt = () => (<svg className="kbolt" viewBox="0 0 16 16" aria-hidden><path d="M5 2.5h6l-1 3H6z" /><path d="M7 5.5v8l1 1.2 1-1.2v-8" /><path d="M7 8h2M7 10.5h2" /></svg>);

