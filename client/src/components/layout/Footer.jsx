import { ArrowUpRight, Instagram, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { brand, footerGroups, footerSocials } from "../../data/siteContent";

const socialIcons = {
  Instagram,
  LinkedIn: Linkedin,
  YouTube: Youtube,
};

function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden border-t border-white/10 bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_28%)]" />
      </div>

      <div className="section-shell relative mx-auto max-w-7xl  px-6 lg:px-8 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_repeat(4,0.8fr)]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white text-sm font-semibold tracking-[0.12em] text-slate-950">
                {brand.mark}
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
                  {brand.name}
                </h2>
              </div>
            </div>
            <p className="max-w-md text-[0.98rem] leading-8 text-white/66">
              {brand.tagline} Calm dashboards, measurable progress, and teacher support for
              adults preparing with purpose.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/42">
                {group.title}
              </p>
              <div className="space-y-3">
                {group.links.map((link) => (
                  <Link
                    className="flex items-center gap-2 text-[0.98rem] text-white/66 transition hover:text-emerald-300"
                    key={link.label}
                    to={link.to}
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="h-4 w-4 opacity-50" />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-white/42">
              Social
            </p>
            <div className="flex flex-wrap gap-3">
              {footerSocials.map((social) => {
                const Icon = socialIcons[social.label];

                return (
                  <a
                    className="group inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-white/[0.04] text-white/68 transition duration-300 hover:border-emerald-300/30 hover:bg-emerald-500 hover:text-slate-950"
                    href={social.href}
                    key={social.label}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Icon className="h-4 w-4 transition duration-300 group-hover:scale-110" />
                    <span className="sr-only">{social.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/42 lg:flex-row lg:items-center lg:justify-between">
          <p>Copyright 2026 Clarity IELTS.</p>
          <p>Premium desktop-first IELTS preparation for serious goals.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
