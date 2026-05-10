export const SECTION_SCHEMAS: Record<string, { label: string; fields: any[] }> = {
    navbar: { label: 'Navigation', fields: [{ key: 'logo', selector: 'a, span.font-bold', label: 'Logo Text', type: 'text' }] },
    hero: { label: 'Hero Section', fields: [{ key: 'h1', selector: 'h1, h2', label: 'Headline', type: 'text' }, { key: 'sub', selector: 'p.text-lg, p.text-xl', label: 'Sub-headline', type: 'textarea' }] },
    feature: { label: 'Features', fields: [{ key: 'h2', selector: 'h2, h3', label: 'Title', type: 'text' }, { key: 'p', selector: 'p', label: 'Desc', type: 'textarea' }] },
    cta: { label: 'Call to Action', fields: [{ key: 'h2', selector: 'h2', label: 'Title', type: 'text' }, { key: 'p', selector: 'p', label: 'Desc', type: 'textarea' }] },
    testimonial: { label: 'Testimonial', fields: [{ key: 'quote', selector: 'p, blockquote', label: 'Quote', type: 'textarea' }, { key: 'name', selector: 'h4, span.font-bold', label: 'Name', type: 'text' }] },
    pricing: { label: 'Pricing', fields: [{ key: 'h2', selector: 'h2', label: 'Title', type: 'text' }] },
    footer: { label: 'Footer', fields: [{ key: 'h2', selector: 'h2, h1', label: 'Headline', type: 'text' }, { key: 'copy', selector: 'p', label: 'Copyright', type: 'text' }] },
    about: { label: 'About', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }, { key: 'p', selector: 'p', label: 'Description', type: 'textarea' }] },
    services: { label: 'Services', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }, { key: 'p', selector: 'p', label: 'Description', type: 'textarea' }] },
    gallery: { label: 'Gallery', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }] },
    team: { label: 'Team', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }, { key: 'p', selector: 'p', label: 'Description', type: 'textarea' }] },
    faq: { label: 'FAQ', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }, { key: 'p', selector: 'p', label: 'Description', type: 'textarea' }] },
    stats: { label: 'Stats', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }] },
    process: { label: 'Process', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }, { key: 'p', selector: 'p', label: 'Description', type: 'textarea' }] },
    trust: { label: 'Trust/Clients', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }] },
    contact: { label: 'Contact', fields: [{ key: 'h2', selector: 'h2', label: 'Headline', type: 'text' }, { key: 'p', selector: 'p', label: 'Description', type: 'textarea' }] }
};

export const SECTION_TEMPLATES: Record<string, { label: string, html: string }[]> = {
    navbar: [
        {
            label: 'Floating Pill',
            html: `
<header class="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 transition-all duration-300">
    <nav class="backdrop-blur-2xl bg-white/10 border border-white/20 px-8 py-4 rounded-full flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <a href="#" class="text-xl font-black tracking-tight text-white mix-blend-difference">{{logo}}</a>
        <div class="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
            <a href="#" class="hover:text-white transition-colors">Products</a>
            <a href="#" class="hover:text-white transition-colors">Solutions</a>
            <a href="#" class="hover:text-white transition-colors">Pricing</a>
        </div>
        <button class="bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform">Get Started</button>
    </nav>
</header>`
        },
        {
            label: 'Centered Editorial',
            html: `
<header class="w-full py-8 px-12 absolute top-0 z-50 bg-transparent flex items-center justify-between border-b border-white/10">
    <div class="flex items-center gap-8 text-sm font-medium tracking-wide text-white/70 uppercase">
        <a href="#" class="hover:text-white transition-colors">Shop</a>
        <a href="#" class="hover:text-white transition-colors">Lookbook</a>
    </div>
    <a href="#" class="text-3xl font-serif italic font-black tracking-tighter text-white absolute left-1/2 -translate-x-1/2">{{logo}}</a>
    <div class="flex items-center gap-8 text-sm font-medium tracking-wide text-white/70 uppercase">
        <a href="#" class="hover:text-white transition-colors">Journal</a>
        <a href="#" class="hover:text-white transition-colors">Cart (0)</a>
    </div>
</header>`
        },
        {
            label: 'Minimalist Side',
            html: `
<header class="w-full py-6 px-10 absolute top-0 z-50 flex items-center justify-between">
    <a href="#" class="text-2xl font-black text-white">{{logo}}</a>
    <button class="w-10 h-10 flex flex-col items-end justify-center gap-1.5 group">
        <div class="w-8 h-0.5 bg-white transition-all group-hover:w-10"></div>
        <div class="w-5 h-0.5 bg-white transition-all group-hover:w-10"></div>
        <div class="w-8 h-0.5 bg-white transition-all group-hover:w-10"></div>
    </button>
</header>`
        },
        {
            label: 'Glass Bordered',
            html: `
<header class="w-full h-20 border-b border-white/10 flex items-center justify-between px-10 backdrop-blur-md sticky top-0 z-50">
    <div class="flex items-center gap-10">
        <a href="#" class="text-2xl font-black text-white tracking-tighter uppercase">{{logo}}</a>
        <div class="hidden md:flex gap-6 text-sm font-bold text-white/40 uppercase tracking-widest">
            <a href="#" class="hover:text-white transition-colors">Work</a>
            <a href="#" class="hover:text-white transition-colors">Vision</a>
            <a href="#" class="hover:text-white transition-colors">Contact</a>
        </div>
    </div>
    <button class="px-6 py-3 border border-white/20 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all">Project Inquiry</button>
</header>`
        },
        {
            label: 'Dark Split',
            html: `
<header class="w-full flex">
    <div class="w-1/4 h-20 bg-zinc-900 border-r border-white/5 flex items-center justify-center font-black text-white text-xl">{{logo}}</div>
    <nav class="flex-1 h-20 bg-black flex items-center justify-center gap-12 text-xs font-bold text-white/40 uppercase tracking-[0.2em]">
        <a href="#" class="hover:text-white hover:translate-y-[-2px] transition-all">Design</a>
        <a href="#" class="hover:text-white hover:translate-y-[-2px] transition-all">Engineering</a>
        <a href="#" class="hover:text-white hover:translate-y-[-2px] transition-all">Story</a>
    </nav>
</header>`
        }
    ],
    hero: [
        {
            label: 'Split 2026',
            html: `
<section class="relative w-full min-h-[80vh] flex flex-col lg:flex-row items-center bg-black overflow-hidden group">
  <div class="w-full lg:w-1/2 p-8 lg:p-20 flex flex-col justify-center relative z-10">
    <h1 class="text-5xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-8">{{h1}}</h1>
    <p class="text-lg lg:text-xl text-white/60 leading-relaxed mb-10 max-w-xl font-medium">{{sub}}</p>
    <button class="w-fit px-12 py-5 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest text-sm hover:scale-105 transition-all">Experience Now</button>
  </div>
  <div class="w-full lg:w-1/2 h-[50vh] lg:h-full relative overflow-hidden">
    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop" class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110" id="__img_hero" />
  </div>
</section>`
        },
        {
            label: 'Centered Glass',
            html: `
<section class="relative w-full min-h-screen flex items-center justify-center p-6 bg-zinc-950 overflow-hidden">
  <div class="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent"></div>
  <div class="relative z-10 text-center max-w-4xl">
    <div class="backdrop-blur-3xl bg-white/[0.03] border border-white/10 rounded-[4rem] p-16 lg:p-24 shadow-2xl">
      <h1 class="text-6xl lg:text-9xl font-black text-white leading-none tracking-tighter mb-8">{{h1}}</h1>
      <p class="text-xl lg:text-2xl text-white/50 mb-12 font-medium leading-relaxed max-w-2xl mx-auto">{{sub}}</p>
      <button class="px-16 py-6 rounded-full bg-white text-black font-black uppercase tracking-tighter text-lg hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] transition-all">Join The Future</button>
    </div>
  </div>
</section>`
        },
        {
            label: 'Big Typography',
            html: `
<section class="w-full min-h-screen bg-black flex flex-col justify-end p-10 lg:p-20 relative">
  <h1 class="text-[12vw] font-black text-white leading-[0.8] tracking-tighter mb-12 mix-blend-difference">{{h1}}</h1>
  <div class="flex flex-col lg:flex-row items-end justify-between gap-10">
    <p class="text-xl lg:text-2xl text-white/60 max-w-xl font-medium leading-relaxed">{{sub}}</p>
    <div class="flex gap-4">
        <button class="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">↓</button>
    </div>
  </div>
</section>`
        },
        {
            label: 'Overlay Modern',
            html: `
<section class="relative w-full h-screen bg-zinc-900">
    <img src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop" class="w-full h-full object-cover opacity-60" id="__img_hero_full" />
    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
    <div class="absolute bottom-20 left-10 lg:left-20 max-w-4xl">
        <h1 class="text-6xl lg:text-[7rem] font-black text-white leading-none tracking-tighter mb-10">{{h1}}</h1>
        <div class="flex items-center gap-10">
            <p class="text-xl text-white/70 max-w-md">{{sub}}</p>
            <div class="h-0.5 w-24 bg-amber-500"></div>
        </div>
    </div>
</section>`
        },
        {
            label: 'Asymmetric Grid',
            html: `
<section class="w-full min-h-screen bg-[#050505] grid grid-cols-1 lg:grid-cols-12 gap-0">
    <div class="lg:col-span-7 p-10 lg:p-24 flex flex-col justify-center border-r border-white/5">
        <div class="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-8">Selected Case Study</div>
        <h1 class="text-5xl lg:text-8xl font-black text-white leading-[0.95] tracking-tighter mb-12">{{h1}}</h1>
        <p class="text-xl text-white/40 mb-12 max-w-xl">{{sub}}</p>
        <button class="w-fit text-white font-black uppercase text-xs tracking-widest border-b-2 border-white/20 pb-2 hover:border-white transition-all">Learn More</button>
    </div>
    <div class="lg:col-span-5 bg-zinc-900 relative">
        <div class="absolute inset-0 bg-amber-500/10 mix-blend-overlay"></div>
        <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop" class="w-full h-full object-cover" id="__img_hero_side" />
    </div>
</section>`
        }
    ],
    feature: [
        {
            label: 'Bento Grid',
            html: `
<section class="w-full py-24 bg-black px-6">
  <div class="max-w-7xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2 bg-zinc-900 rounded-[2.5rem] p-12 relative overflow-hidden border border-white/5">
        <h2 class="text-4xl font-black text-white mb-6">{{h2}}</h2>
        <p class="text-white/50 text-lg max-w-md">{{p}}</p>
      </div>
      <div class="bg-amber-500 rounded-[2.5rem] p-10 flex flex-col justify-end">
        <div class="text-black font-black text-3xl">100% Reliable</div>
      </div>
      <div class="bg-zinc-900 rounded-[2.5rem] p-10 border border-white/5">
        <div class="text-white font-bold mb-2">Fast Execution</div>
        <div class="text-white/40 text-sm">Under 2ms response time</div>
      </div>
      <div class="md:col-span-2 bg-white rounded-[2.5rem] p-10 flex items-center justify-between">
        <div class="text-black font-black text-2xl max-w-xs">Smart automation for high-growth teams.</div>
        <div class="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white">→</div>
      </div>
    </div>
  </div>
</section>`
        },
        {
            label: 'Glass List',
            html: `
<section class="w-full py-24 bg-zinc-950 px-6">
  <div class="max-w-5xl mx-auto space-y-4">
    <div class="text-center mb-16">
        <h2 class="text-4xl lg:text-5xl font-black text-white mb-4">{{h2}}</h2>
        <p class="text-white/40">{{p}}</p>
    </div>
    <div class="group relative backdrop-blur-xl bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.05] transition-all flex items-center justify-between">
      <div class="flex items-center gap-6">
        <div class="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">01</div>
        <div class="text-2xl font-bold text-white">Global Infrastructure</div>
      </div>
      <div class="text-white/40 group-hover:text-white transition-colors">→</div>
    </div>
    <div class="group relative backdrop-blur-xl bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.05] transition-all flex items-center justify-between">
      <div class="flex items-center gap-6">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-black">02</div>
        <div class="text-2xl font-bold text-white">Advanced Security</div>
      </div>
      <div class="text-white/40 group-hover:text-white transition-colors">→</div>
    </div>
  </div>
</section>`
        },
        {
            label: 'Visual Split',
            html: `
<section class="w-full py-24 px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center bg-black">
    <div class="space-y-10">
        <h2 class="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">{{h2}}</h2>
        <p class="text-xl text-white/50 leading-relaxed max-w-md">{{p}}</p>
        <ul class="space-y-4">
            <li class="flex items-center gap-4 text-white font-bold"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Intuitive Controls</li>
            <li class="flex items-center gap-4 text-white font-bold"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Real-time Sync</li>
        </ul>
    </div>
    <div class="relative">
        <div class="aspect-square bg-zinc-900 rounded-[4rem] overflow-hidden rotate-3 hover:rotate-0 transition-transform duration-700">
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" class="w-full h-full object-cover" id="__img_feat" />
        </div>
    </div>
</section>`
        },
        {
            label: 'Icon Grid',
            html: `
<section class="w-full py-24 bg-[#080808] text-center px-10">
    <h2 class="text-4xl font-black text-white mb-20">{{h2}}</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-6xl mx-auto">
        <div class="space-y-6 flex flex-col items-center">
            <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center justify-center text-amber-500">✦</div>
            <h3 class="text-lg font-bold text-white">Innovation</h3>
            <p class="text-sm text-white/40">{{p}}</p>
        </div>
        <div class="space-y-6 flex flex-col items-center">
            <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center justify-center text-blue-500">⌘</div>
            <h3 class="text-lg font-bold text-white">Scalability</h3>
            <p class="text-sm text-white/40">Built for mass traffic.</p>
        </div>
        <div class="space-y-6 flex flex-col items-center">
            <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center justify-center text-purple-500">⌬</div>
            <h3 class="text-lg font-bold text-white">Automated</h3>
            <p class="text-sm text-white/40">Zero manual tasks.</p>
        </div>
        <div class="space-y-6 flex flex-col items-center">
            <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-[1.5rem] flex items-center justify-center text-rose-500">⚡</div>
            <h3 class="text-lg font-bold text-white">Speed</h3>
            <p class="text-sm text-white/40">Instant deployment.</p>
        </div>
    </div>
</section>`
        },
        {
            label: 'Modern Marquee',
            html: `
<section class="w-full py-24 bg-black overflow-hidden border-y border-white/5">
    <div class="text-[8rem] font-black text-white/5 uppercase whitespace-nowrap tracking-tighter select-none animate-marquee">
        {{h2}} • INNOVATION • {{h2}} • INNOVATION • {{h2}}
    </div>
    <div class="max-w-2xl mx-auto text-center mt-[-4rem] relative z-10 px-6">
        <p class="text-2xl text-white font-medium leading-relaxed">{{p}}</p>
    </div>
</section>`
        }
    ],
    cta: [
        {
            label: 'Floating Card',
            html: `
<section class="w-full py-32 bg-black px-6">
  <div class="max-w-5xl mx-auto backdrop-blur-3xl bg-white/5 border border-white/10 rounded-[4rem] p-20 text-center relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-blue-500/10"></div>
    <h2 class="text-5xl lg:text-7xl font-black text-white mb-10 tracking-tighter">{{h2}}</h2>
    <p class="text-xl text-white/50 mb-12 max-w-2xl mx-auto">{{p}}</p>
    <button class="px-16 py-6 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-sm hover:scale-110 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]">Start Today</button>
  </div>
</section>`
        },
        {
            label: 'Split Inverse',
            html: `
<section class="w-full grid grid-cols-1 lg:grid-cols-2 bg-white">
    <div class="p-10 lg:p-24 flex flex-col justify-center bg-black text-white">
        <h2 class="text-5xl font-black mb-8">{{h2}}</h2>
        <p class="text-white/60 mb-10 text-xl">{{p}}</p>
        <button class="w-fit px-10 py-4 bg-white text-black font-bold rounded-xl">Contact Us</button>
    </div>
    <div class="p-10 lg:p-24 flex flex-col justify-center items-center text-center">
        <h2 class="text-5xl font-black text-black mb-8">Ready?</h2>
        <button class="px-12 py-5 bg-black text-white font-black rounded-full uppercase tracking-widest text-sm">Create Account</button>
    </div>
</section>`
        },
        {
            label: 'Minimalist Waitlist',
            html: `
<section class="w-full py-32 bg-zinc-950 px-10 text-center">
    <h2 class="text-6xl font-black text-white mb-12 tracking-tighter">{{h2}}</h2>
    <div class="flex flex-col sm:flex-row max-w-2xl mx-auto gap-4">
        <input type="email" placeholder="Email address" class="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-white/30" />
        <button class="px-10 py-4 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-widest">Join</button>
    </div>
    <p class="mt-8 text-white/30 text-xs">{{p}}</p>
</section>`
        },
        {
            label: 'Full Color CTA',
            html: `
<section class="w-full py-32 bg-amber-500 text-center">
    <h2 class="text-6xl lg:text-[8rem] font-black text-black leading-none tracking-tighter mb-10">{{h2}}</h2>
    <p class="text-black/60 text-2xl font-bold mb-12 max-w-3xl mx-auto">{{p}}</p>
    <button class="px-16 py-6 bg-black text-white font-black rounded-full uppercase tracking-widest hover:scale-105 transition-all">Get Unlimited Access</button>
</section>`
        },
        {
            label: 'Dark Banner',
            html: `
<section class="w-full py-20 bg-zinc-900 border-y border-white/5 flex flex-col lg:flex-row items-center justify-between px-10 lg:px-24">
    <div class="max-w-2xl text-center lg:text-left mb-10 lg:mb-0">
        <h2 class="text-4xl font-black text-white mb-4">{{h2}}</h2>
        <p class="text-white/40 text-lg">{{p}}</p>
    </div>
    <button class="px-10 py-4 bg-white text-black font-bold rounded-xl shrink-0">Get In Touch</button>
</section>`
        }
    ],
    testimonial: [
        {
            label: 'Masonry Wall',
            html: `
<section class="w-full py-24 bg-black px-6">
  <div class="max-w-7xl mx-auto">
    <div class="columns-1 md:columns-3 gap-6 space-y-6">
      <div class="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 break-inside-avoid backdrop-blur-xl">
        <p class="text-white/80 text-lg leading-relaxed italic mb-8">"{{quote}}"</p>
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-zinc-800"></div>
          <div><h4 class="text-white font-bold text-sm">{{name}}</h4><p class="text-[10px] text-white/40 uppercase font-black">Founder</p></div>
        </div>
      </div>
    </div>
  </div>
</section>`
        },
        {
            label: 'Featured Quote',
            html: `
<section class="w-full py-32 bg-zinc-950 px-6 text-center">
    <div class="text-8xl font-serif text-amber-500/20 mb-[-2rem] select-none">"</div>
    <h3 class="text-3xl lg:text-6xl font-medium text-white leading-tight mb-16 max-w-5xl mx-auto">{{quote}}</h3>
    <div class="flex flex-col items-center">
        <div class="w-20 h-20 rounded-full bg-zinc-800 border-4 border-white/5 mb-6"></div>
        <h4 class="text-2xl font-bold text-white">{{name}}</h4>
        <p class="text-amber-500 text-xs font-black uppercase tracking-[0.3em] mt-2">Executive Partner</p>
    </div>
</section>`
        },
        {
            label: 'Split Testimonial',
            html: `
<section class="w-full flex flex-col lg:flex-row min-h-[60vh] bg-black">
    <div class="w-full lg:w-1/2 bg-zinc-900 flex items-center justify-center p-12 lg:p-24">
        <div class="relative">
            <div class="text-[15rem] font-black text-white/5 absolute -top-20 -left-10 select-none">"</div>
            <p class="text-2xl lg:text-4xl text-white font-medium italic relative z-10">{{quote}}</p>
        </div>
    </div>
    <div class="w-full lg:w-1/2 flex flex-col justify-center p-12 lg:p-24 border-l border-white/5">
        <h4 class="text-3xl font-black text-white mb-2">{{name}}</h4>
        <p class="text-white/40 mb-10">Chief Strategy Officer</p>
        <div class="flex gap-1 text-amber-500">★★★★★</div>
    </div>
</section>`
        },
        {
            label: 'Card Slider',
            html: `
<section class="w-full py-24 bg-black px-10">
    <div class="flex flex-col md:flex-row gap-8 overflow-x-auto pb-10 scrollbar-hide">
        <div class="min-w-[400px] bg-white text-black p-12 rounded-[3rem]">
            <p class="text-2xl font-bold mb-10">"{{quote}}"</p>
            <div class="font-black uppercase tracking-widest text-xs">{{name}}</div>
        </div>
        <div class="min-w-[400px] bg-zinc-900 text-white p-12 rounded-[3rem] border border-white/5">
            <p class="text-2xl font-bold mb-10">"Incredible results in weeks."</p>
            <div class="font-black uppercase tracking-widest text-xs text-white/40">Sarah King</div>
        </div>
    </div>
</section>`
        },
        {
            label: 'Minimalist Center',
            html: `
<section class="w-full py-24 bg-[#050505] text-center px-10 border-y border-white/5">
    <p class="text-2xl lg:text-3xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-10">{{quote}}</p>
    <div class="text-sm font-black text-amber-500 uppercase tracking-widest">— {{name}}</div>
</section>`
        }
    ],
    pricing: [
        {
            label: 'Premium 3-Tier',
            html: `
<section class="w-full py-24 bg-black px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-24">
        <h2 class="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-6">{{h2}}</h2>
        <div class="w-20 h-1 bg-amber-500 mx-auto"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <div class="bg-zinc-900 rounded-[3rem] p-12 border border-white/5 flex flex-col">
        <div class="text-white/40 font-black uppercase text-[10px] tracking-widest mb-4">Start</div>
        <div class="text-5xl font-black text-white mb-10">$0</div>
        <ul class="space-y-4 text-white/60 text-sm mb-12 flex-1">
          <li class="flex items-center gap-3">✓ 1 Workspace</li>
          <li class="flex items-center gap-3">✓ Basic Analytics</li>
        </ul>
        <button class="w-full py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">Select</button>
      </div>
      <div class="bg-white rounded-[3rem] p-12 flex flex-col scale-105 shadow-[0_0_80px_rgba(255,255,255,0.1)]">
        <div class="text-black/40 font-black uppercase text-[10px] tracking-widest mb-4">Most Loved</div>
        <div class="text-5xl font-black text-black mb-10">$49</div>
        <ul class="space-y-4 text-black/60 text-sm mb-12 flex-1 font-medium">
          <li class="flex items-center gap-3">✓ Unlimited Projects</li>
          <li class="flex items-center gap-3">✓ Custom Domain</li>
          <li class="flex items-center gap-3">✓ Priority Support</li>
        </ul>
        <button class="w-full py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs">Go Pro</button>
      </div>
      <div class="bg-zinc-900 rounded-[3rem] p-12 border border-white/5 flex flex-col">
        <div class="text-white/40 font-black uppercase text-[10px] tracking-widest mb-4">Custom</div>
        <div class="text-5xl font-black text-white mb-10">$$$</div>
        <ul class="space-y-4 text-white/60 text-sm mb-12 flex-1">
          <li class="flex items-center gap-3">✓ Enterprise SLA</li>
          <li class="flex items-center gap-3">✓ API Access</li>
        </ul>
        <button class="w-full py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all">Talk To Us</button>
      </div>
    </div>
  </div>
</section>`
        },
        {
            label: 'Dark Side-by-Side',
            html: `
<section class="w-full py-24 bg-[#0a0a0a] px-10">
    <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div class="p-12 bg-black border border-white/10 rounded-[3rem]">
            <h3 class="text-3xl font-black text-white mb-4">Monthly</h3>
            <p class="text-white/40 mb-10">Flexible commitment.</p>
            <div class="text-6xl font-black text-white mb-12">$29<span class="text-sm text-white/30 font-normal">/mo</span></div>
            <button class="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl">Start Monthly</button>
        </div>
        <div class="p-12 bg-amber-500 rounded-[3rem]">
            <h3 class="text-3xl font-black text-black mb-4">Yearly</h3>
            <p class="text-black/40 mb-10">Save 40% annually.</p>
            <div class="text-6xl font-black text-black mb-12">$19<span class="text-sm text-black/30 font-normal">/mo</span></div>
            <button class="w-full py-5 bg-black text-white font-black uppercase tracking-widest text-xs rounded-2xl">Save Now</button>
        </div>
    </div>
</section>`
        },
        {
            label: 'Minimalist Horizontal',
            html: `
<section class="w-full py-32 bg-black px-10 border-y border-white/5">
    <div class="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-20">
        <div class="max-w-md">
            <h2 class="text-5xl font-black text-white mb-6 tracking-tighter">{{h2}}</h2>
            <p class="text-white/40">Full access to all current and future features. One-time payment, lifetime updates.</p>
        </div>
        <div class="p-12 bg-zinc-900 rounded-[3rem] border border-white/10 text-center w-full lg:w-96">
            <div class="text-7xl font-black text-white mb-8">$199</div>
            <button class="w-full py-5 bg-amber-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl">Get Lifetime</button>
        </div>
    </div>
</section>`
        },
        {
            label: 'Feature Comparison',
            html: `
<section class="w-full py-24 bg-[#050505] px-10 text-white">
    <h2 class="text-4xl font-black text-center mb-20">{{h2}}</h2>
    <div class="max-w-4xl mx-auto space-y-4">
        <div class="flex justify-between p-6 border-b border-white/5 font-bold"><span class="text-white/40">Custom Domains</span><span>✓</span></div>
        <div class="flex justify-between p-6 border-b border-white/5 font-bold"><span class="text-white/40">API Access</span><span>Pro Only</span></div>
        <div class="flex justify-between p-6 border-b border-white/5 font-bold"><span class="text-white/40">Team Members</span><span>Unlimited</span></div>
        <div class="pt-10 flex justify-center"><button class="px-12 py-5 bg-white text-black font-black uppercase rounded-full">View All Plans</button></div>
    </div>
</section>`
        },
        {
            label: 'Cyberpunk Pricing',
            html: `
<section class="w-full py-24 bg-black px-10 overflow-hidden relative">
    <div class="absolute top-0 right-0 w-96 h-96 bg-fuchsia-600/20 blur-[150px]"></div>
    <div class="max-w-4xl mx-auto relative z-10 border-l-4 border-cyan-400 p-16 bg-zinc-900/40 backdrop-blur-3xl">
        <h2 class="text-6xl font-black text-white italic tracking-tighter mb-4">{{h2}}</h2>
        <p class="text-cyan-400 font-mono text-sm mb-12">> INITIALIZING_SECURE_PAYMENT_GATEWAY...</p>
        <div class="text-8xl font-black text-white mb-16">$9.99<span class="text-xl text-fuchsia-400 font-mono tracking-normal ml-4">/SEC</span></div>
        <button class="px-10 py-5 bg-cyan-400 text-black font-black uppercase skew-x-[-12deg] hover:bg-white transition-all">Execute Purchase</button>
    </div>
</section>`
        }
    ],
    footer: [
        {
            label: 'Typography Giant',
            html: `
<footer class="w-full bg-black pt-32 pb-12 px-10 border-t border-white/10 overflow-hidden">
  <h2 class="text-[18vw] font-black text-white leading-none tracking-tighter mb-20 text-center opacity-10 select-none">{{h2}}</h2>
  <div class="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-20 border-t border-white/5 pt-20 mb-20">
    <div class="space-y-6">
        <h4 class="text-white font-bold text-sm uppercase tracking-widest">Connect</h4>
        <div class="flex flex-col gap-4 text-white/40 text-sm">
            <a href="#" class="hover:text-white transition-colors">X / Twitter</a>
            <a href="#" class="hover:text-white transition-colors">Instagram</a>
        </div>
    </div>
    <div class="space-y-6">
        <h4 class="text-white font-bold text-sm uppercase tracking-widest">Services</h4>
        <div class="flex flex-col gap-4 text-white/40 text-sm">
            <a href="#" class="hover:text-white transition-colors">Product Design</a>
            <a href="#" class="hover:text-white transition-colors">AI Engineering</a>
        </div>
    </div>
  </div>
  <div class="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-black text-white/20 uppercase tracking-widest">
    <div>{{copy}}</div>
    <div>2026 Studio Edition</div>
  </div>
</footer>`
        },
        {
            label: 'Minimalist Single',
            html: `
<footer class="w-full bg-black py-10 px-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
    <div class="text-xl font-black text-white">{{logo}}</div>
    <div class="flex gap-10 text-xs font-bold text-white/40 uppercase tracking-widest">
        <a href="#" class="hover:text-white">Imprint</a>
        <a href="#" class="hover:text-white">Privacy</a>
    </div>
    <div class="text-[10px] text-white/20 uppercase font-black tracking-[0.4em]">{{copy}}</div>
</footer>`
        },
        {
            label: 'Contact Centered',
            html: `
<footer class="w-full py-32 bg-zinc-950 text-center px-10 border-t border-white/10">
    <div class="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] mb-8">Ready to start?</div>
    <a href="mailto:hello@example.com" class="text-4xl lg:text-7xl font-black text-white hover:text-white/70 transition-all underline decoration-white/10 underline-offset-[20px] mb-20 block italic">{{h2}}</a>
    <div class="flex justify-center gap-12 text-sm text-white/30 font-medium">
        <span>Tokyo</span>
        <span>Berlin</span>
        <span>New York</span>
    </div>
    <div class="mt-20 pt-10 border-t border-white/5 text-[10px] text-white/10 uppercase tracking-widest">{{copy}}</div>
</footer>`
        },
        {
            label: 'Grid Directory',
            html: `
<footer class="w-full bg-black p-10 lg:p-24 border-t border-white/5">
    <div class="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
        <div class="col-span-2"><h3 class="text-3xl font-black text-white mb-6 italic">{{h2}}</h3><p class="text-white/30 text-sm max-w-xs">Building the web of 2026, one pixel at a time.</p></div>
        <div class="space-y-4 text-sm"><h4 class="text-white font-bold mb-6">Learn</h4><a href="#" class="block text-white/40 hover:text-white transition-all">Docs</a><a href="#" class="block text-white/40 hover:text-white transition-all">API</a></div>
        <div class="space-y-4 text-sm"><h4 class="text-white font-bold mb-6">More</h4><a href="#" class="block text-white/40 hover:text-white transition-all">GitHub</a><a href="#" class="block text-white/40 hover:text-white transition-all">Discord</a></div>
    </div>
    <div class="flex justify-between items-center text-[10px] text-white/20 font-black tracking-widest border-t border-white/5 pt-10">{{copy}}</div>
</footer>`
        },
        {
            label: 'Dark Industrial',
            html: `
<footer class="w-full bg-[#030303] py-20 px-10 border-t-8 border-amber-500">
    <div class="flex flex-col lg:flex-row justify-between items-end gap-10">
        <div class="max-w-xl"><h2 class="text-8xl font-black text-white tracking-tighter leading-none mb-10">{{h2}}</h2><p class="text-white/40 font-mono text-sm uppercase tracking-widest">Built with precision. Engineering excellence since 2024.</p></div>
        <div class="text-right space-y-4"><div class="text-xs text-white/20 font-black uppercase tracking-[0.5em]">{{copy}}</div><div class="text-4xl text-white font-black italic shadow-text-amber-500">2026</div></div>
    </div>
</footer>`
        }
    ],
    about: [
        {
            label: 'Split Content',
            html: `
<section class="w-full py-24 bg-white text-black px-6">
  <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
    <div class="w-full md:w-1/2">
        <h2 class="text-5xl lg:text-7xl font-black tracking-tighter mb-8">{{h2}}</h2>
        <p class="text-lg text-black/60 leading-relaxed">{{p}}</p>
    </div>
    <div class="w-full md:w-1/2 aspect-square bg-zinc-100 rounded-[3rem] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop" class="w-full h-full object-cover" />
    </div>
  </div>
</section>`
        }
    ],
    services: [
        {
            label: 'Grid View',
            html: `
<section class="w-full py-24 bg-zinc-50 text-black px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
        <h2 class="text-5xl font-black tracking-tighter mb-4">{{h2}}</h2>
        <p class="text-black/60">{{p}}</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-10 bg-white rounded-[2rem] shadow-sm">
            <h3 class="text-2xl font-bold mb-4">Strategy</h3>
            <p class="text-black/60 text-sm leading-relaxed">Defining the roadmap for digital success and scalable growth.</p>
        </div>
        <div class="p-10 bg-white rounded-[2rem] shadow-sm">
            <h3 class="text-2xl font-bold mb-4">Design</h3>
            <p class="text-black/60 text-sm leading-relaxed">Crafting beautiful, user-centric interfaces that convert.</p>
        </div>
        <div class="p-10 bg-white rounded-[2rem] shadow-sm">
            <h3 class="text-2xl font-bold mb-4">Development</h3>
            <p class="text-black/60 text-sm leading-relaxed">Building robust, scalable applications for the modern web.</p>
        </div>
    </div>
  </div>
</section>`
        }
    ],
    gallery: [
        {
            label: 'Masonry Grid',
            html: `
<section class="w-full py-24 bg-black px-6">
  <div class="max-w-7xl mx-auto">
    <h2 class="text-5xl font-black text-white text-center mb-16 tracking-tighter">{{h2}}</h2>
    <div class="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
        <img src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop" class="w-full rounded-2xl break-inside-avoid" />
        <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop" class="w-full rounded-2xl break-inside-avoid" />
        <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=2070&auto=format&fit=crop" class="w-full rounded-2xl break-inside-avoid" />
    </div>
  </div>
</section>`
        }
    ],
    team: [
        {
            label: 'Profile Cards',
            html: `
<section class="w-full py-24 bg-white text-black px-6">
  <div class="max-w-6xl mx-auto text-center">
    <h2 class="text-5xl font-black tracking-tighter mb-4">{{h2}}</h2>
    <p class="text-black/60 mb-16">{{p}}</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div class="text-left">
            <div class="aspect-square bg-zinc-100 rounded-2xl mb-4 overflow-hidden"><img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop" class="w-full h-full object-cover" /></div>
            <h3 class="font-bold text-lg">Jane Doe</h3>
            <p class="text-black/40 text-sm">CEO & Founder</p>
        </div>
        <div class="text-left">
            <div class="aspect-square bg-zinc-100 rounded-2xl mb-4 overflow-hidden"><img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop" class="w-full h-full object-cover" /></div>
            <h3 class="font-bold text-lg">John Smith</h3>
            <p class="text-black/40 text-sm">CTO</p>
        </div>
    </div>
  </div>
</section>`
        }
    ],
    faq: [
        {
            label: 'Simple Accordion',
            html: `
<section class="w-full py-24 bg-zinc-50 text-black px-6">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16">
        <h2 class="text-5xl font-black tracking-tighter mb-4">{{h2}}</h2>
        <p class="text-black/60">{{p}}</p>
    </div>
    <div class="space-y-4">
        <div class="p-6 bg-white rounded-2xl shadow-sm">
            <h3 class="font-bold text-lg mb-2">How does it work?</h3>
            <p class="text-black/60 text-sm">Simply sign up, connect your data, and our AI takes care of the rest.</p>
        </div>
        <div class="p-6 bg-white rounded-2xl shadow-sm">
            <h3 class="font-bold text-lg mb-2">Is there a free trial?</h3>
            <p class="text-black/60 text-sm">Yes, we offer a 14-day free trial on all plans.</p>
        </div>
    </div>
  </div>
</section>`
        }
    ],
    stats: [
        {
            label: 'Numbers Row',
            html: `
<section class="w-full py-24 bg-black text-white px-6 text-center">
    <h2 class="text-4xl font-black tracking-tighter mb-16">{{h2}}</h2>
    <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
            <div class="text-7xl font-black text-amber-500 mb-2">99%</div>
            <div class="text-white/60 font-medium">Uptime Guarantee</div>
        </div>
        <div>
            <div class="text-7xl font-black text-amber-500 mb-2">10k+</div>
            <div class="text-white/60 font-medium">Active Users</div>
        </div>
        <div>
            <div class="text-7xl font-black text-amber-500 mb-2">24/7</div>
            <div class="text-white/60 font-medium">Support Available</div>
        </div>
    </div>
</section>`
        }
    ],
    process: [
        {
            label: 'Step by Step',
            html: `
<section class="w-full py-24 bg-white text-black px-6">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-20">
        <h2 class="text-5xl font-black tracking-tighter mb-4">{{h2}}</h2>
        <p class="text-black/60">{{p}}</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
        <div class="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-black/10 z-0"></div>
        <div class="relative z-10 text-center">
            <div class="w-24 h-24 mx-auto bg-black text-white rounded-full flex items-center justify-center text-3xl font-black mb-6">1</div>
            <h3 class="font-bold text-xl mb-2">Discovery</h3>
            <p class="text-black/60 text-sm">We learn about your business goals and audience.</p>
        </div>
        <div class="relative z-10 text-center">
            <div class="w-24 h-24 mx-auto bg-black text-white rounded-full flex items-center justify-center text-3xl font-black mb-6">2</div>
            <h3 class="font-bold text-xl mb-2">Strategy</h3>
            <p class="text-black/60 text-sm">We craft a tailored plan to achieve your objectives.</p>
        </div>
        <div class="relative z-10 text-center">
            <div class="w-24 h-24 mx-auto bg-black text-white rounded-full flex items-center justify-center text-3xl font-black mb-6">3</div>
            <h3 class="font-bold text-xl mb-2">Execution</h3>
            <p class="text-black/60 text-sm">We bring the plan to life with precision and care.</p>
        </div>
    </div>
  </div>
</section>`
        }
    ],
    trust: [
        {
            label: 'Logo Cloud',
            html: `
<section class="w-full py-20 bg-zinc-50 px-6 border-y border-black/5 text-center">
    <h2 class="text-sm font-bold text-black/40 uppercase tracking-widest mb-10">{{h2}}</h2>
    <div class="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-50 grayscale">
        <div class="text-2xl font-black">ACME Corp</div>
        <div class="text-2xl font-black">Globex</div>
        <div class="text-2xl font-black">Soylent</div>
        <div class="text-2xl font-black">Initech</div>
    </div>
</section>`
        }
    ],
    contact: [
        {
            label: 'Form & Info',
            html: `
<section class="w-full py-24 bg-white text-black px-6">
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20">
    <div>
        <h2 class="text-5xl font-black tracking-tighter mb-6">{{h2}}</h2>
        <p class="text-black/60 mb-10">{{p}}</p>
        <div class="space-y-6">
            <div>
                <h4 class="font-bold text-sm uppercase tracking-widest text-black/40 mb-1">Email</h4>
                <p class="font-medium">hello@example.com</p>
            </div>
            <div>
                <h4 class="font-bold text-sm uppercase tracking-widest text-black/40 mb-1">Phone</h4>
                <p class="font-medium">+1 (555) 000-0000</p>
            </div>
        </div>
    </div>
    <div class="bg-zinc-50 p-10 rounded-[2rem]">
        <form class="space-y-4">
            <input type="text" placeholder="Name" class="w-full p-4 rounded-xl bg-white border border-black/5 outline-none focus:border-black/20" />
            <input type="email" placeholder="Email" class="w-full p-4 rounded-xl bg-white border border-black/5 outline-none focus:border-black/20" />
            <textarea placeholder="Message" rows="4" class="w-full p-4 rounded-xl bg-white border border-black/5 outline-none focus:border-black/20 resize-none"></textarea>
            <button type="button" class="w-full py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-sm">Send Message</button>
        </form>
    </div>
  </div>
</section>`
        }
    ]
};
