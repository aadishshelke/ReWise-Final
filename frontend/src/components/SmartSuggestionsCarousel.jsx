import { motion } from "framer-motion";
import { useRef } from "react";

const suggestions = [
  { icon: "✅", text: "Review yesterday's lesson" },
  { icon: "🎉", text: "Congratulate top student" },
  { icon: "📝", text: "Plan next week's quiz" },
  { icon: "💡", text: "Try a new teaching strategy" },
  { icon: "📊", text: "Check class analytics" },
];

export function SmartSuggestionsCarousel() {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  return (
    <div className="relative">
      {/* Left Scroll Button (desktop only) */}
      <button
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-soft rounded-full p-2 hover:shadow-md"
        onClick={() => scroll(-1)}
        aria-label="Scroll left"
      >
        &#8592;
      </button>
      {/* Right Scroll Button (desktop only) */}
      <button
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-soft rounded-full p-2 hover:shadow-md"
        onClick={() => scroll(1)}
        aria-label="Scroll right"
      >
        &#8594;
      </button>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto py-2 px-1 scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {suggestions.map((s, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="min-w-[220px] bg-white p-4 rounded-xl shadow-soft hover:shadow-md transition flex items-center gap-3"
          >
            <span className="text-2xl">{s.icon}</span>
            <span className="font-medium text-gray-700">{s.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 