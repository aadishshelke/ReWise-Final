import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, HelpCircle, Award, Target } from "lucide-react";

const badges = [
  { icon: <Star size={24} />, label: "Star Teacher", unlocked: true },
  { icon: <HelpCircle size={24} />, label: "Quiz Master", unlocked: false },
  { icon: <Award size={24} />, label: "Fluency Champ", unlocked: false },
  { icon: <Target size={24} />, label: "Class Leader", unlocked: false },
];

export function XPBadgeSection() {
  // Example XP data
  const [xp, setXp] = useState(1500); // Simulate level up
  const xpToNext = 1500;
  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeUnlocked, setBadgeUnlocked] = useState(false);

  useEffect(() => {
    if (xp >= xpToNext) {
      setShowConfetti(true);
      setBadgeUnlocked(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [xp]);

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      {/* XP Earned Today */}
      <div>
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">XP Earned Today</span>
          <span className="text-orange-500 font-bold">120 / 200 XP</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <motion.div
            className="bg-orange-500 h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={{ duration: 1 }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Keep it up! You’re almost at <span className="text-orange-500 font-semibold">Level 6</span>!
        </p>
      </div>

      {/* Badges Row */}
      <div className="flex justify-around items-center">
        {badges.map((badge, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.1 }}
            className={`flex flex-col items-center p-2 rounded-lg ${
              badge.unlocked ? "text-teal-500" : "text-gray-400"
            }`}
          >
            {badge.icon}
            <span className="text-xs mt-1">{badge.label}</span>
            {!badge.unlocked && (
              <motion.div
                whileHover={{ scale: 1.2 }}
                className="text-[10px] text-gray-400 mt-1 italic"
              >
                🔒 Locked
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center space-x-4 my-4 relative">
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute left-1/2 top-0 text-3xl"
            >
              🎉🎊✨
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          animate={badgeUnlocked ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="bg-yellow-200 rounded-full px-4 py-2 font-bold"
        >
          Level 5
        </motion.div>
        <div className="text-gray-500">XP: {xp}/{xpToNext}</div>
      </div>
    </div>
  );
}
