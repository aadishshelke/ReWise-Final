import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";

export function HeaderSection() {
  // XP progress values
  const level = 5;
  const percent = 60; // Example: 60% progress
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - percent / 100);

  return (
    <div className="bg-white p-6 rounded-xl shadow-soft flex flex-col md:flex-row justify-between items-center">
      {/* Welcome + XP */}
      <div className="flex items-center gap-4">
        {/* Circular XP Progress */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full" width="64" height="64">
            <circle
              className="text-gray-200"
              strokeWidth="5"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="32"
              cy="32"
            />
            <motion.circle
              className="text-accent"
              strokeWidth="5"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="32"
              cy="32"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              animate={{ strokeDashoffset: progress }}
              initial={false}
              transition={{ duration: 1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-accent">
            Lv {level}
          </div>
        </div>

        {/* Welcome Text */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Good Morning, SuperTeacher!</h1>
          <p className="text-gray-500 text-sm">Here's your progress snapshot for today</p>
        </div>
      </div>

      {/* BalBuddy Tip */}
      <div className="flex items-center gap-2 mt-4 md:mt-0">
        <Lightbulb className="text-primary" />
        <p className="text-gray-600 italic text-sm">
          Tip: Use Quick Actions to save time!
        </p>
      </div>
    </div>
  );
} 