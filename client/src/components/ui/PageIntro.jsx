function PageIntro({ eyebrow, title, copy, aside }) {
  return (
    <section className="section-shell pt-40">
      <div className="surface-card overflow-hidden p-8 lg:p-12">
        <div className="grid gap-10 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-6">
            <p className="glass-pill">{eyebrow}</p>
            <div className="space-y-5">
              <h1 className="text-balance text-[3rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 lg:text-[4.4rem]">
                {title}
              </h1>
              <p className="max-w-2xl text-[1.02rem] leading-8 text-slate-600 lg:text-[1.08rem]">
                {copy}
              </p>
            </div>
          </div>
          <div className="surface-card-sm h-full p-6">
            {aside}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PageIntro;
