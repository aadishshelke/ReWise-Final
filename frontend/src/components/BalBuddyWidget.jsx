import { useState } from "react";

const tips = [
  "Try the new Smart Suggestions!",
  "Check your analytics for trends.",
  "Use Quick Actions to save time.",
  "Congratulate your top student today!",
];

export function BalBuddyWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="fixed bottom-8 right-8 bg-white rounded-full shadow-lg p-4 flex items-center space-x-2 cursor-pointer hover:shadow-xl transition"
        onClick={() => setOpen(true)}
      >
        <img src="/rewise.jpeg" alt="ReWise AI Agent" className="h-12 w-12 rounded-full object-cover border-2 border-primary/20 shadow-md" />
        <span className="font-semibold text-orange-500">ReWise: Need a tip?</span>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg w-80 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="font-bold text-lg mb-2 text-primary">ReWise Quick Tips</h2>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              {tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
