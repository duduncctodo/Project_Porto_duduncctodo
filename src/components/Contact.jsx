// Static contact links section — no state
export default function Contact() {
  return (
    <section className="relative items-center text-center pb-0" id="contact">
      <div className="mb-lg scroll-fade">
        <h2 className="text-[clamp(3rem,8vw,6rem)] font-headline-xl font-bold leading-none tracking-tighter mb-0 text-on-surface">CONTACT</h2>
      </div>
      <div className="flex gap-sm w-full justify-center max-w-2xl mx-auto parallax-element scroll-fade">
        <a className="font-label-code text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant pb-1" href="#">Email</a>
        <span className="text-outline-variant">/</span>
        <a className="font-label-code text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant pb-1" href="#">LinkedIn</a>
        <span className="text-outline-variant">/</span>
        <a className="font-label-code text-on-surface-variant hover:text-primary transition-colors border-b border-outline-variant pb-1" href="#">Twitter</a>
      </div>
    </section>
  )
}
