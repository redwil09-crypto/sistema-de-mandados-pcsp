import os

path = r'c:\Users\redwi\OneDrive\Desktop\APP CAPTURAS\sistema-de-mandados-pcsp (4)\src\pages\Stats.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('bg-surface-light/40 dark:bg-zinc-900/40', 'bg-white/60 dark:bg-zinc-900/40')
text = text.replace('border border-white/5 shadow-2xl', 'border border-black/5 dark:border-white/5 shadow-xl dark:shadow-2xl')

# Dev button texts
text = text.replace('border border-white/10 rounded-xl', 'border border-black/10 dark:border-white/10 rounded-xl')
text = text.replace('text-white/50 uppercase tracking-widest', 'text-black/50 dark:text-white/50 uppercase tracking-widest')
text = text.replace('text-white/30 max-w-sm', 'text-black/40 dark:text-white/30 max-w-sm')

# Chart
text = text.replace('text-[10px] uppercase tracking-[0.3em] text-white/40', 'text-[10px] uppercase tracking-[0.3em] text-black/40 dark:text-white/40')
text = text.replace("tick={{ fontSize: 10, fill: '#ffffff40', fontWeight: 'bold' }}", "tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }}")
text = text.replace("tick={{ fontSize: 10, fill: '#ffffff40' }}", "tick={{ fontSize: 10, fill: '#888' }}")
text = text.replace(
    "contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #ffffff10', color: '#fff' }}",
    "contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.8)', borderRadius: '12px', border: '1px solid rgba(128,128,128,0.2)', backdropFilter: 'blur(8px)' }}"
)
text = text.replace("cursor={{ fill: 'rgba(255,255,255,0.03)' }}", "cursor={{ fill: 'rgba(128,128,128,0.05)' }}")

# Heatmap text
text = text.replace('hover:bg-white/5 p-2 rounded-lg', 'hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-lg')
text = text.replace('text-white/70 uppercase tracking-wider', 'text-black/70 dark:text-white/70 uppercase tracking-wider')
text = text.replace('bg-white/5 rounded-full overflow-hidden', 'bg-black/5 dark:bg-white/5 rounded-full overflow-hidden')
text = text.replace('text-white/20 text-[10px]', 'text-black/40 dark:text-white/20 text-[10px]')
text = text.replace('border border-dashed border-white/5', 'border border-dashed border-black/10 dark:border-white/5')
text = text.replace('border-t border-white/5', 'border-t border-black/5 dark:border-white/5')

# Crimes & nature
text = text.replace('hover:bg-white/5 transition-colors', 'hover:bg-black/5 dark:hover:bg-white/5 transition-colors')
text = text.replace('text-2xl font-black text-white', 'text-2xl font-black text-black dark:text-white')
text = text.replace('text-[8px] text-white/40 uppercase', 'text-[8px] text-black/50 dark:text-white/40 uppercase')
text = text.replace('bg-white/5 rounded-xl border border-white/5', 'bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5')
text = text.replace('text-white/70 group-hover/item:text-white', 'text-black/70 dark:text-white/70 group-hover/item:text-black dark:group-hover/item:text-white')

# Tactics
text = text.replace('bg-zinc-900/40 backdrop-blur-xl p-5', 'bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl p-5')
text = text.replace('text-white text-lg', 'text-black dark:text-white text-lg')
text = text.replace('text-white/30 uppercase tracking-widest', 'text-black/40 dark:text-white/30 uppercase tracking-widest')
text = text.replace('text-[9px] font-black text-white/20', 'text-[9px] font-black text-black/50 dark:text-white/20')

# Cards
text = text.replace('bg-zinc-900/40 border-white/5 hover:bg-white/5', 'bg-white/60 dark:bg-zinc-900/40 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5')
text = text.replace('text-white/10', 'text-black/20 dark:text-white/10')

text = text.replace("text-white/20'}`}>{stats.urgent}", "text-black/50 dark:text-white/20'}`}>{stats.urgent}")
text = text.replace("text-white/20'}`}>{stats.expired}", "text-black/50 dark:text-white/20'}`}>{stats.expired}")

text = text.replace('text-[9px] font-black uppercase tracking-[0.2em] text-white/40', 'text-[9px] font-black uppercase tracking-[0.2em] text-black/50 dark:text-white/40')

# StatCards values text colors:
text = text.replace('text-blue-400', 'text-blue-600 dark:text-blue-400')
text = text.replace('text-red-400', 'text-red-600 dark:text-red-400')
text = text.replace('text-emerald-400', 'text-emerald-600 dark:text-emerald-400')
text = text.replace('text-indigo-400', 'text-indigo-600 dark:text-indigo-400')

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Stats.tsx Updated!")
