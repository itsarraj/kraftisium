import React from 'react';
import { JobsFilterState, DEFAULT_JOBS_FILTER } from '../types/filters';

interface FilterSidebarProps {
  filter: JobsFilterState;
  onChange: (filter: JobsFilterState) => void;
  onClose?: () => void;
  isMobileOverlay?: boolean;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filter,
  onChange,
  onClose,
  isMobileOverlay = false,
}) => {
  const update = (partial: Partial<JobsFilterState>) => {
    onChange({ ...filter, ...partial });
  };

  const locationOptions = [
    { value: 'all' as const, label: 'All locations' },
    { value: 'remote' as const, label: 'Remote' },
    { value: 'onsite' as const, label: 'On-site' },
  ];

  const salaryPeriodOptions = [
    { value: 'any' as const, label: 'Any' },
    { value: 'hourly' as const, label: 'Hourly' },
    { value: 'monthly' as const, label: 'Monthly' },
    { value: 'yearly' as const, label: 'Yearly' },
  ];

  const salaryMinOptions = [
    { value: null, label: 'Any' },
    { value: 30000, label: '> 30k' },
    { value: 50000, label: '> 50k' },
    { value: 80000, label: '> 80k' },
    { value: 100000, label: '> 100k' },
  ];

  const dateOptions = [
    { value: null, label: 'All time' },
    { value: 1, label: 'Last 24 hours' },
    { value: 3, label: 'Last 3 days' },
    { value: 7, label: 'Last 7 days' },
  ];

  const employmentOptions = [
    { value: null, label: 'Any' },
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Temporary', label: 'Temporary' },
  ];

  const content = (
    <div className="flex flex-col justify-start items-start flex-grow relative gap-4">
      <div className="flex justify-between items-center w-full">
        <p className="text-xl font-bold text-left text-[#fcc636]">Filters</p>
        {isMobileOverlay && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white text-sm"
          >
            Close
          </button>
        )}
      </div>

      {/* Location */}
      <div className="flex flex-col gap-3 w-full">
        <p className="text-lg font-medium text-left text-white">Location</p>
        <div className="flex flex-col gap-2">
          {locationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ location: opt.value })}
              className="flex justify-start items-center gap-2 cursor-pointer group text-left"
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  filter.location === opt.value ? 'bg-[#fcc636] border-[#fcc636]' : 'bg-[#2b2b2b] border-white/30'
                }`}
              >
                {filter.location === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#2b2b2b]" />}
              </div>
              <p
                className={`text-base ${
                  filter.location === opt.value ? 'text-[#fcc636] font-medium' : 'text-white/70 group-hover:text-white'
                }`}
              >
                {opt.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Salary period */}
      <div className="flex flex-col gap-3 w-full">
        <p className="text-lg font-medium text-left text-white">Salary</p>
        <div className="flex w-full">
          {salaryPeriodOptions.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ salaryPeriod: opt.value })}
              className={`flex-1 py-2 px-2 text-[13px] border border-white/10 cursor-pointer transition-colors ${
                idx === 0 ? 'rounded-l-sm' : ''
              } ${idx === 3 ? 'rounded-r-sm' : ''} ${
                filter.salaryPeriod === opt.value ? 'bg-[#fcc636] text-[#2b2b2b] font-bold' : 'bg-[#2b2b2b] text-white/70 hover:bg-[#333]'
              } ${idx === 1 || idx === 2 ? 'border-x-0' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {salaryMinOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => update({ salaryMin: opt.value })}
              className="flex justify-start items-center gap-2 cursor-pointer group text-left"
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  filter.salaryMin === opt.value ? 'bg-[#fcc636] border-[#fcc636]' : 'bg-[#2b2b2b] border-white/30'
                }`}
              >
                {filter.salaryMin === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#2b2b2b]" />}
              </div>
              <p
                className={`text-base ${
                  filter.salaryMin === opt.value ? 'text-[#fcc636] font-medium' : 'text-white/70 group-hover:text-white'
                }`}
              >
                {opt.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-3 w-full">
        <p className="text-lg font-medium text-left text-white">Date of posting</p>
        <div className="flex flex-col gap-2">
          {dateOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => update({ postedWithinDays: opt.value })}
              className="flex justify-start items-center gap-2 cursor-pointer group text-left"
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  filter.postedWithinDays === opt.value ? 'bg-[#fcc636] border-[#fcc636]' : 'bg-[#2b2b2b] border-white/30'
                }`}
              >
                {filter.postedWithinDays === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#2b2b2b]" />}
              </div>
              <p
                className={`text-base ${
                  filter.postedWithinDays === opt.value ? 'text-[#fcc636] font-medium' : 'text-white/70 group-hover:text-white'
                }`}
              >
                {opt.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Employment type */}
      <div className="flex flex-col gap-3 w-full">
        <p className="text-lg font-medium text-left text-white">Type of employment</p>
        <div className="flex flex-col gap-2">
          {employmentOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => update({ employmentType: opt.value })}
              className="flex justify-start items-center gap-2 cursor-pointer group text-left"
            >
              <div
                className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                  filter.employmentType === opt.value ? 'bg-[#fcc636] border-[#fcc636]' : 'bg-[#2b2b2b] border-white/30'
                }`}
              >
                {filter.employmentType === opt.value && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="#2b2b2b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <p
                className={`text-base ${
                  filter.employmentType === opt.value ? 'text-[#fcc636] font-medium' : 'text-white/70 group-hover:text-white'
                }`}
              >
                {opt.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_JOBS_FILTER)}
        className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-sm font-medium text-white/70 hover:text-white hover:bg-[#333] transition-colors"
      >
        Reset filters
      </button>
    </div>
  );

  const baseClasses =
    'flex justify-start items-start flex-grow-0 flex-shrink-0 w-[250px] overflow-hidden gap-6 p-6 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-brand';

  if (isMobileOverlay) {
    return (
      <div className={`${baseClasses} fixed top-0 left-0 h-full z-50 overflow-y-auto`}>
        {content}
      </div>
    );
  }

  return <div className={baseClasses}>{content}</div>;
};

export default FilterSidebar;
