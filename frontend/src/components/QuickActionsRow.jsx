import { motion } from "framer-motion";
import { Plus, BookOpen, Users, BarChart } from "lucide-react";

const actions = [
  { icon: <Plus size={28} />, label: "Create Lesson", cta: true },
  { icon: <BookOpen size={28} />, label: "View Lessons" },
  { icon: <Users size={28} />, label: "Manage Students" },
  { icon: <BarChart size={28} />, label: "Analytics" },
];

export function QuickActionsRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((a, i) => (
        <motion.button
          key={i}
          whileHover={{ scale: 1.05 }}
          className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-soft transition font-semibold text-sm gap-2
            ${a.cta ? "bg-accent text-white hover:bg-accent/90" : "bg-primary text-white hover:bg-primary/90"}
          `}
        >
          {a.icon}
          <span>{a.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
