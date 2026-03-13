import { LayoutTemplate, Sparkles, Box, Layout } from 'lucide-react';

export default function TemplatesPage() {
    const templates = [
        {
            name: "Luxury Minimalist",
            vibe: "Elegant, Dark, Premium",
            bestFor: "Barbershops, High-end Studios",
            preview: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop",
            tag: "Dribbble Style"
        },
        {
            name: "Modern Urban",
            vibe: "Clean, High Contrast, Bold",
            bestFor: "Tech Startups, Creative Agencies",
            preview: "https://images.unsplash.com/photo-1550745165-9bc0b252723f?q=80&w=2070&auto=format&fit=crop",
            tag: "SaaS Focus"
        },
        {
            name: "Classic Heritage",
            vibe: "Warm, Trustworthy, Serene",
            bestFor: "Law Firms, Medical practices",
            preview: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop",
            tag: "Professional"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black mb-2 tracking-tighter">Template Registry</h1>
                <p className="text-white/40">Select the visual identity for your Prospect's future digital home.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {templates.map((template, i) => (
                    <div key={i} className="glass rounded-[40px] border-white/5 overflow-hidden group hover:border-accent-gold/30 transition-all">
                        <div className="aspect-video relative overflow-hidden bg-premium-700">
                            <img
                                src={template.preview}
                                alt={template.name}
                                className="w-full h-full object-cover opacity-50 group-hover:opacity-80 group-hover:scale-110 transition-all duration-700"
                            />
                            <div className="absolute top-6 right-6">
                                <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-accent-gold">
                                    {template.tag}
                                </span>
                            </div>
                        </div>

                        <div className="p-8 space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold">{template.name}</h3>
                                <div className="p-2 rounded-xl bg-accent-gold/10 text-accent-gold">
                                    <Sparkles size={16} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-xs">
                                    <Box size={14} className="text-white/20" />
                                    <span className="text-white/40">Vibe:</span>
                                    <span className="font-semibold">{template.vibe}</span>
                                </div>
                                <div className="flex items-start gap-3 text-xs">
                                    <Layout size={14} className="text-white/20 mt-0.5" />
                                    <span className="text-white/40">Best For:</span>
                                    <span className="font-semibold">{template.bestFor}</span>
                                </div>
                            </div>

                            <button className="w-full py-4 rounded-2xl border border-white/10 font-bold hover:bg-white hover:text-black transition-all active:scale-95">
                                Configure Template
                            </button>
                        </div>
                    </div>
                ))}

                <div className="glass rounded-[40px] border-dashed border-2 border-white/10 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-accent-gold/50 transition-all">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Sparkles size={32} className="text-white/20 group-hover:text-accent-gold" />
                    </div>
                    <h4 className="font-bold text-white/40 group-hover:text-white">Request Custom Blueprint</h4>
                    <p className="text-xs text-white/20 mt-2 max-w-[150px]">Our designers can forge a unique identity for major clients.</p>
                </div>
            </div>
        </div>
    );
}
