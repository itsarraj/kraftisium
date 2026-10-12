import { Link } from 'react-router-dom';
import type { CareerOpening } from '../../constants/careers';

type Props = {
  opening: CareerOpening;
};

export default function CareerRoleCard({ opening }: Props) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 flex flex-col h-full hover:border-[#fcc636]/40 transition-colors">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#fcc636]">
          {opening.department}
        </span>
        <span className="text-xs text-white/40">·</span>
        <span className="text-xs text-white/50">{opening.employmentType}</span>
      </div>
      <h3 className="text-xl font-bold text-white">{opening.title}</h3>
      <p className="mt-2 text-sm text-white/60 flex-1">{opening.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {opening.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded-md bg-[#2b2b2b] border border-white/10 text-white/70">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-white/50">
        <span>{opening.location}</span>
        <span>{opening.duration}</span>
      </div>
      <Link
        to={`/careers/${opening.id}`}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#fcc636] py-3 font-bold text-[#2b2b2b] hover:bg-[#e6b535] transition-colors">
        View role →
      </Link>
    </article>
  );
}
