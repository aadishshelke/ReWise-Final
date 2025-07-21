import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const languages = ["Hindi", "Marathi", "English", "Other"];
const subjects = ["Math", "Science", "Social Studies", "Language"];
const grades = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  school: z.string().min(1, "School name is required"),
  languages: z.array(z.string()).min(1, "Select at least one language"),
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
  grades: z.array(z.string()).min(1, "Select at least one grade"),
  schedule: z.string().optional(),
});

function TailwindCheckbox({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`w-5 h-5 border rounded flex items-center justify-center transition focus:outline-none ${checked ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <span className="text-white text-xs">✓</span>}
    </button>
  );
}

export default function TeacherProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      school: "",
      languages: [],
      subjects: [],
      grades: [],
      schedule: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    // Dummy Firebase save function
    await new Promise((res) => setTimeout(res, 1200));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => navigate("/onboarding/syllabus"), 1000);
  };

  const selectedLanguages = watch("languages");
  const selectedSubjects = watch("subjects");
  const selectedGrades = watch("grades");

  return (
    <div className="min-h-screen flex items-center justify-center bg-softbg dark:bg-gray-950 py-8">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl shadow-soft p-6 bg-white dark:bg-gray-900">
          <div className="mb-4 text-primary font-semibold text-sm">Step 1 of 3 — Teacher Profile Setup</div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block font-medium mb-1">Name *</label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input {...field} placeholder="Your Name" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              />
              <AnimatePresence>
                {errors.name && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-500 text-xs mt-1">
                    {errors.name.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* School */}
            <div>
              <label className="block font-medium mb-1">School Name *</label>
              <Controller
                name="school"
                control={control}
                render={({ field }) => (
                  <input {...field} placeholder="School Name" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              />
              <AnimatePresence>
                {errors.school && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-500 text-xs mt-1">
                    {errors.school.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Languages */}
            <div>
              <label className="block font-medium mb-1">Preferred Languages *</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {languages.map((lang) => (
                  <button
                    type="button"
                    key={lang}
                    className={`px-3 py-1 rounded-full border text-sm font-medium transition
                      ${selectedLanguages.includes(lang) ? "bg-primary text-white border-primary" : "bg-gray-100 border-gray-300 text-gray-700"}
                    `}
                    onClick={() => {
                      setValue(
                        "languages",
                        selectedLanguages.includes(lang)
                          ? selectedLanguages.filter((l) => l !== lang)
                          : [...selectedLanguages, lang],
                        { shouldValidate: true }
                      );
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {errors.languages && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-500 text-xs mt-1">
                    {errors.languages.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Subjects */}
            <div>
              <label className="block font-medium mb-1">Subjects Taught *</label>
              <div className="flex flex-wrap gap-2 mb-1">
                {subjects.map((subj) => (
                  <button
                    type="button"
                    key={subj}
                    className={`px-3 py-1 rounded-full border text-sm font-medium transition
                      ${selectedSubjects.includes(subj) ? "bg-accent text-white border-accent" : "bg-gray-100 border-gray-300 text-gray-700"}
                    `}
                    onClick={() => {
                      setValue(
                        "subjects",
                        selectedSubjects.includes(subj)
                          ? selectedSubjects.filter((s) => s !== subj)
                          : [...selectedSubjects, subj],
                        { shouldValidate: true }
                      );
                    }}
                  >
                    {subj}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {errors.subjects && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-500 text-xs mt-1">
                    {errors.subjects.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Grades */}
            <div>
              <label className="block font-medium mb-1">Grades Handled *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-1">
                {grades.map((grade) => (
                  <label key={grade} className="flex items-center gap-2 cursor-pointer">
                    <Controller
                      name="grades"
                      control={control}
                      render={({ field }) => (
                        <TailwindCheckbox
                          checked={field.value.includes(grade)}
                          onChange={(checked) => {
                            setValue(
                              "grades",
                              checked
                                ? [...field.value, grade]
                                : field.value.filter((g) => g !== grade),
                              { shouldValidate: true }
                            );
                          }}
                        />
                      )}
                    />
                    <span className="text-sm">{grade}</span>
                  </label>
                ))}
              </div>
              <AnimatePresence>
                {errors.grades && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-500 text-xs mt-1">
                    {errors.grades.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Schedule */}
            <div>
              <label className="block font-medium mb-1">Teaching Schedule (optional)</label>
              <Controller
                name="schedule"
                control={control}
                render={({ field }) => (
                  <input {...field} placeholder="e.g. Mon-Fri, 9am-2pm" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              />
            </div>
            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-accent text-white font-semibold py-2 rounded-lg text-lg hover:bg-accent/90 transition"
                disabled={!isValid || loading}
              >
                {loading ? "Saving..." : "Save & Continue"}
              </button>
              <AnimatePresence>
                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-green-600 text-center mt-2">
                    Profile saved! Redirecting...
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
} 