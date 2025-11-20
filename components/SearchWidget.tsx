import React, { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchWidgetProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const SearchWidget: React.FC<SearchWidgetProps> = ({ searchQuery, setSearchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHovering = useRef(false);

  const handleMouseEnter = () => {
      isHovering.current = true;
      setIsExpanded(true);
  };

  const handleMouseLeave = () => {
      isHovering.current = false;
      // Only close if the input is not focused
      if (document.activeElement !== inputRef.current) {
          setIsExpanded(false);
      }
  };

  const handleFocus = () => {
      setIsExpanded(true);
  };

  const handleBlur = () => {
      // Only close if we are not currently hovering
      if (!isHovering.current) {
          setIsExpanded(false);
      }
  };

  const toggleExpand = () => {
      if (!isExpanded) {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 0);
      } else {
         inputRef.current?.focus();
      }
  };

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchQuery('');
      inputRef.current?.focus();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          inputRef.current?.blur();
      }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-30 flex justify-end`}>
      <div 
        className={`flex items-center bg-stone-800/80 backdrop-blur-sm border border-stone-700 shadow-lg rounded-xl transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'w-64 p-2' : 'w-10 h-10 justify-center cursor-pointer hover:bg-stone-700'}`}
        onClick={!isExpanded ? toggleExpand : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isExpanded ? (
            <div className="flex items-center w-full gap-2">
                <Search size={18} className="text-stone-400 ml-2 flex-shrink-0" />
                <input 
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Search..."
                    className="bg-transparent border-none focus:ring-0 text-white text-sm w-full placeholder-stone-500 outline-none"
                />
                <button onClick={handleClear} className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-700">
                    <X size={16} />
                </button>
            </div>
        ) : (
            <Search size={20} className={searchQuery ? "text-amber-500" : "text-stone-400"} />
        )}
      </div>
    </div>
  );
};