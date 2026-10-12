import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const HeroSearch: React.FC = () => {
  const navigate = useNavigate();
  const [position, setPosition] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const q = position.trim();
    const loc = location.trim();
    if (q) params.set('q', q);
    if (loc) params.set('location', loc);
    params.set('page', '1');
    const query = params.toString();
    navigate(query ? `/jobs?${query}` : '/jobs');
  };

  return (
    <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 gap-10">
      <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 relative gap-2">
        <p className="flex-grow-0 flex-shrink-0 text-[56px] font-bold text-left leading-tight">
          <span className="text-white">Find your </span>
          <span className="text-[#fcc636]">new job</span>
          <span className="text-white"> today</span>
        </p>
        <p className="flex-grow-0 flex-shrink-0 text-lg text-left text-white/70 max-w-2xl">
          Thousands of jobs in the computer, engineering and technology sectors are waiting for you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col lg:flex-row justify-start items-stretch self-stretch flex-grow-0 flex-shrink-0 shadow-brand w-full"
      >
        <div className="flex justify-start items-center flex-grow relative overflow-hidden gap-4 p-[18px] rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none bg-[#1a1a1a] border border-white/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-grow-0 flex-shrink-0 w-6 h-6 text-[#fcc636]">
            <path fillRule="evenodd" clipRule="evenodd" d="M10.875 3.75C6.93997 3.75 3.75 6.93997 3.75 10.875C3.75 14.81 6.93997 18 10.875 18C14.81 18 18 14.81 18 10.875C18 6.93997 14.81 3.75 10.875 3.75ZM2.25 10.875C2.25 6.11154 6.11154 2.25 10.875 2.25C15.6385 2.25 19.5 6.11154 19.5 10.875C19.5 15.6385 15.6385 19.5 10.875 19.5C6.11154 19.5 2.25 15.6385 2.25 10.875Z" fill="currentColor" />
            <path fillRule="evenodd" clipRule="evenodd" d="M15.9134 15.9134C16.2063 15.6205 16.6812 15.6205 16.9741 15.9134L21.5303 20.4697C21.8232 20.7626 21.8232 21.2374 21.5303 21.5303C21.2374 21.8232 20.7625 21.8232 20.4696 21.5303L15.9134 16.9741C15.6205 16.6812 15.6205 16.2063 15.9134 15.9134Z" fill="currentColor" />
          </svg>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="What position are you looking for?"
            className="flex-grow bg-transparent outline-none text-base text-white placeholder-white/50"
          />
        </div>

        <div className="flex justify-start items-center flex-grow lg:flex-grow-0 lg:w-[420px] relative overflow-hidden gap-4 p-[18px] bg-[#1a1a1a] border-x border-b lg:border-y lg:border-r border-white/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-grow-0 flex-shrink-0 w-6 h-6 text-[#fcc636]">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 3C10.2098 3 8.4929 3.71116 7.22703 4.97703C5.96116 6.2429 5.25 7.95979 5.25 9.75C5.25 12.855 6.98389 15.6822 8.81595 17.7891C9.72283 18.832 10.6316 19.6729 11.3139 20.2528C11.5837 20.4821 11.8172 20.6699 12 20.8125C12.1828 20.6699 12.4163 20.4821 12.6861 20.2528C13.3684 19.6729 14.2772 18.832 15.184 17.7891C17.0161 15.6822 18.75 12.855 18.75 9.75C18.75 7.95979 18.0388 6.2429 16.773 4.97703C15.5071 3.71116 13.7902 3 12 3ZM12 21.75C11.5699 22.3644 11.5697 22.3643 11.5695 22.3641L11.5688 22.3637L11.5671 22.3624L11.5615 22.3585L11.5425 22.345C11.5263 22.3334 11.5031 22.3167 11.4736 22.2952C11.4144 22.252 11.3294 22.189 11.2223 22.1071C11.0081 21.9434 10.7049 21.7038 10.3424 21.3957C9.61838 20.7803 8.65217 19.8867 7.68405 18.7734C5.76611 16.5678 3.75 13.395 3.75 9.75C3.75 7.56196 4.61919 5.46354 6.16637 3.91637C7.71354 2.36919 9.81196 1.5 12 1.5C14.188 1.5 16.2865 2.36919 17.8336 3.91637C19.3808 5.46354 20.25 7.56196 20.25 9.75C20.25 13.395 18.2339 16.5678 16.316 18.7734C15.3478 19.8867 14.3816 20.7803 13.6576 21.3957C13.2951 21.7038 12.9919 21.9434 12.7777 22.1071C12.6706 22.189 12.5856 22.252 12.5264 22.2952C12.4969 22.3167 12.4737 22.3334 12.4575 22.345L12.4385 22.3585L12.4329 22.3624L12.4312 22.3637L12.4305 22.3641C12.4303 22.3643 12.4301 22.3644 12 21.75ZM12 21.75L12.4301 22.3644C12.1719 22.5452 11.8281 22.5452 11.5699 22.3644L12 21.75Z" fill="currentColor" />
          </svg>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="flex-grow bg-transparent outline-none text-base text-white placeholder-white/50"
          />
        </div>

        <button
          type="submit"
          className="flex justify-center items-center flex-grow-0 flex-shrink-0 relative gap-2 px-10 py-[18px] rounded-b-lg lg:rounded-r-lg lg:rounded-bl-none bg-[#fcc636] hover:bg-[#e6b535] transition-colors"
        >
          <p className="text-base font-bold text-[#2b2b2b]">Search job</p>
        </button>
      </form>
    </div>
  );
};

export default HeroSearch;
