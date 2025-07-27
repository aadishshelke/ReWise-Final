import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SUBJECTS = [
  {
    name: "Math",
    topics: ["Fractions", "Decimals", "Geometry", "Algebra", "Measurement"],
  },
  {
    name: "Science",
    topics: ["Plants", "Animals", "Matter", "Energy", "Earth"],
  },
  {
    name: "Language",
    topics: ["Grammar", "Reading", "Writing", "Vocabulary"],
  },
  {
    name: "Social Studies",
    topics: ["History", "Geography", "Civics", "Culture"],
  },
];

export default function SyllabusSetup() {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0].name);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else setDragActive(false);
  };

  const handleTopicToggle = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((res) => setTimeout(res, 1200));
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl shadow-2xl shadow-black/30 p-8 bg-surface border border-border-subtle">
          <div className="mb-4 text-primary font-semibold text-sm">Step 2 of 3 — Syllabus Setup</div>
          {/* Info Banner */}
          <div className="mb-4 bg-primary/10 text-primary rounded p-2 text-xs text-center">
            You can edit your syllabus later from Settings.
          </div>
          {/* Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center mb-4 transition cursor-pointer ${dragActive ? "border-accent bg-accent/10" : "border-border-subtle bg-surface-sunken"}`}
            onClick={() => fileInputRef.current.click()}
            onDrop={handleDrop}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <div className="text-lg font-semibold mb-1 text-text-main">📝 Upload Your Syllabus</div>
            <div className="text-xs text-text-secondary mb-2">Supports PDF, DOCX, Images</div>
            {file ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium text-text-main">{file.name}</span>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700 text-lg"
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="text-accent text-sm">Drag & drop or click to select</div>
            )}
          </div>
          {/* Subject Tabs */}
          <div className="flex gap-2 mb-2">
            {SUBJECTS.map((subj) => (
              <button
                key={subj.name}
                className={`px-3 py-1 rounded-full font-medium text-sm transition border
                  ${selectedSubject === subj.name ? "bg-primary text-white border-primary" : "bg-surface-sunken border-border-subtle text-text-secondary"}
                `}
                onClick={() => setSelectedSubject(subj.name)}
                type="button"
              >
                {subj.name}
              </button>
            ))}
          </div>
          {/* Topics Chips */}
          <div className="flex flex-wrap gap-2 mb-2">
            {SUBJECTS.find(s => s.name === selectedSubject).topics.map((topic) => (
              <motion.button
                key={topic}
                type="button"
                whileTap={{ scale: 0.95 }}
                animate={selectedTopics.includes(topic) ? { scale: [1, 1.1, 1] } : {}}
                className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-1 transition
                  ${selectedTopics.includes(topic) ? "bg-accent text-white border-accent" : "bg-surface-sunken border-border-subtle text-text-secondary"}
                `}
                onClick={() => handleTopicToggle(topic)}
              >
                {selectedTopics.includes(topic) && <span className="text-green-300">✓</span>}
                {topic}
              </motion.button>
            ))}
          </div>
          {/* Selected Topics Preview */}
          {selectedTopics.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedTopics.map((topic) => (
                <span key={topic} className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  ✓ {topic}
                </span>
              ))}
            </div>
          )}
          {/* Save Button */}
          <div className="pt-2">
            <button
              className="w-full bg-accent text-white font-semibold py-2 rounded-lg text-lg hover:bg-accent/90 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
              onClick={handleSave}
              disabled={saving || (!file && selectedTopics.length === 0)}
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Start Using Sahayak"}
            </button>
            <AnimatePresence>
              {saving && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-primary text-center mt-2">
                  Saving your syllabus...
                </motion.div>
              )}
              {saved && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-green-400 text-center mt-2">
                  Syllabus saved! Redirecting...
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 