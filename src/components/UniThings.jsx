// Static "Uni Things" cards section — no state
export default function UniThings() {
  return (
    <section className="relative" id="uni">
      <div className="mb-lg flex items-center gap-sm scroll-fade">
        <span className="material-symbols-outlined text-primary text-3xl">school</span>
        <h2 className="font-headline-lg text-[32px] font-bold tracking-wide">UNI THINGS</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md parallax-element">
        <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group">
          <div className="w-full aspect-[4/3] bg-surface-container-highest relative overflow-hidden">
            <img alt="Research Lab" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 grayscale group-hover:grayscale-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbCXrOtyK61gTu4FSqwm9ELpYYh6pSGI723taKy65pD_F7VqVl-sRFJJyxke3dkHepY5G-1V7SqleDVHeVlmRlOkXsu9dnmg_mtif7fkQUMdgOrp-K_TK5mlnU-j8t_GTUurd85lkS75b4ksvHYWTU8VwN1nj0duKU5huKFfNjiQx_YJrAm9EjjiUnkpFQRMsHgDOD4zpeeihhWM3uLLqMDDSDuK1YXDmKbnkH2b7lERz8MhGBfA-GpTIysaEbRDdj0wCAkcgRvZt-" />
          </div>
          <div className="p-md flex flex-col flex-grow bg-surface-dim/50">
            <span className="material-symbols-outlined text-on-surface-variant mb-sm text-[28px]">science</span>
            <h3 className="font-headline-lg text-[20px] font-bold mb-xs">Research Lab</h3>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam erat volutpat.
            </p>
          </div>
        </div>
        <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group" style={{ transitionDelay: '100ms' }}>
          <div className="w-full aspect-[4/3] bg-surface-container-highest relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuAxzmSc1rGWwydT-JqGOvHQq9gZkRumnU7zxaYilv4zngw4dXtULQjjP1YBovjwTQ6bMaquK0BqXgHNWD_A_yoxdTfIIc79qJJM3VT8t2exFthASJCPktLJOqElVhgcF4W7z6b4lOQtxIF3AwfQJ4aNjfogBe7kUBd97yyIjZnzAEBA0v0jx9N3EjVkNQrP5114g9rLQ0jFipg9g62TViQjZOR1BUnLFuWmdGvpEFaad7aeQvhLy7ggA5wZb1zAh3cKS3YLH1semCX7')] bg-cover bg-center opacity-30 grayscale mix-blend-overlay"></div>
            <h4 className="font-headline-xl font-bold text-on-surface z-10 text-center uppercase tracking-widest text-[24px]">Byte<br />Breakers</h4>
          </div>
          <div className="p-md flex flex-col flex-grow bg-surface-dim/50">
            <span className="material-symbols-outlined text-on-surface-variant mb-sm text-[28px]">code</span>
            <h3 className="font-headline-lg text-[20px] font-bold mb-xs">Hackathon Club</h3>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              Suspendisse potenti. Nullam id dolor id nibh ultricies vehicula ut id elit.
            </p>
          </div>
        </div>
        <div className="glass-panel p-0 overflow-hidden flex flex-col hover-glow transition-all duration-300 scroll-fade group" style={{ transitionDelay: '200ms' }}>
          <div className="w-full aspect-[4/3] bg-surface-container-highest relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest to-surface-container-high opacity-80"></div>
            <h4 className="font-headline-xl font-bold text-on-surface z-10 text-center uppercase tracking-widest text-[24px]">Archi-Tech<br />Studio</h4>
          </div>
          <div className="p-md flex flex-col flex-grow bg-surface-dim/50">
            <span className="material-symbols-outlined text-on-surface-variant mb-sm text-[28px]">architecture</span>
            <h3 className="font-headline-lg text-[20px] font-bold mb-xs">Design Studio</h3>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              Cras justo odio, dapibus ac facilisis in, egestas eget quam.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
