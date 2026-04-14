"use client";

type Suggestion = {
  label: string;
  value: string;
  category: string;
};

export function AccountsSearchSuggestions({
  suggestions,
  title,
  onSelect,
}: {
  suggestions: Suggestion[];
  title: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200">
        {title}
      </div>
      <div className="max-h-60 overflow-auto py-1">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.value}
            onClick={() => onSelect(suggestion.value)}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center justify-between group transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 group-hover:text-gray-900">{suggestion.label}</span>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{suggestion.category}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
