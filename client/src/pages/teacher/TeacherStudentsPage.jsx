import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import {
  ConfirmStudentRemovalModal,
  PanelShell,
  StatusBadge,
} from "../../components/teacher/TeacherPanelPrimitives";
import {
  readTeacherStudentMemberships,
  resolveTeacherStudentsWithClassIds,
  writeTeacherStudentMemberships,
} from "../../lib/teacherClassStore";

function buildInferredEmail(student) {
  if (student.email) {
    return student.email;
  }

  return `${student.name.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")}@ieltsai.app`;
}

function getPaymentStatus(student) {
  return student.paymentStatus ?? (student.id.length % 4 === 0 ? "Unpaid" : "Paid");
}

function parseBandScore(student) {
  const score = Number.parseFloat(student.currentBand);
  return Number.isFinite(score) ? Math.round(score * 2) / 2 : 6.0;
}

function formatBandScore(student) {
  const score = parseBandScore(student);
  return score.toFixed(1);
}

function TeacherStudentsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [studentsState, setStudentsState] = useState(() => resolveTeacherStudentsWithClassIds());
  const [studentPendingRemoval, setStudentPendingRemoval] = useState(null);
  const teacherManagedStudents = studentsState.filter((student) => student.classId);
  const studentsWithScores = teacherManagedStudents
    .map((student) => ({ student, score: parseBandScore(student) }))
    .filter((item) => item.score !== null);
  const weaknessCounts = teacherManagedStudents.reduce((counts, student) => {
    if (student.weakArea) {
      counts[student.weakArea] = (counts[student.weakArea] ?? 0) + 1;
    }

    return counts;
  }, {});
  const highestWeaknessCount = Math.max(0, ...Object.values(weaknessCounts));
  const mostCommonWeaknesses = Object.entries(weaknessCounts)
    .filter(([, count]) => count === highestWeaknessCount)
    .map(([weakness]) => weakness);
  const unpaidStudentsCount = teacherManagedStudents.filter((student) => getPaymentStatus(student) === "Unpaid").length;
  const lowestScoreStudent = studentsWithScores.reduce(
    (lowest, item) => (!lowest || item.score < lowest.score ? item : lowest),
    null,
  );
  const highestScoreStudent = studentsWithScores.reduce(
    (highest, item) => (!highest || item.score > highest.score ? item : highest),
    null,
  );
  const averageScore = studentsWithScores.length
    ? studentsWithScores.reduce((sum, item) => sum + item.score, 0) / studentsWithScores.length
    : null;
  const lowestScoreCount = lowestScoreStudent
    ? studentsWithScores.filter((item) => item.score === lowestScoreStudent.score).length
    : 0;
  const highestScoreCount = highestScoreStudent
    ? studentsWithScores.filter((item) => item.score === highestScoreStudent.score).length
    : 0;
  const indicators = [
    {
      label: "All students",
      value: String(teacherManagedStudents.length),
      helper: "Assigned to this teacher",
    },
    {
      label: "Most common weakness",
      value: mostCommonWeaknesses.length ? mostCommonWeaknesses.join(", ") : "No data",
      helper: highestWeaknessCount
        ? `${highestWeaknessCount} ${highestWeaknessCount === 1 ? "student" : "students"}`
        : "No weak areas yet",
    },
    {
      label: "Unpaid students",
      value: String(unpaidStudentsCount),
      helper: "Payment status",
    },
    {
      label: "Lowest score",
      value: lowestScoreStudent ? lowestScoreStudent.score.toFixed(1) : "No data",
      helper: lowestScoreStudent
        ? `${lowestScoreCount} ${lowestScoreCount === 1 ? "student has" : "students have"} this score`
        : "No scores yet",
    },
    {
      label: "Average score",
      value: averageScore === null ? "No data" : averageScore.toFixed(1),
      helper: "Average score of all students",
    },
    {
      label: "Highest score",
      value: highestScoreStudent ? highestScoreStudent.score.toFixed(1) : "No data",
      helper: highestScoreStudent
        ? `${highestScoreCount} ${highestScoreCount === 1 ? "student has" : "students have"} this score`
        : "No scores yet",
    },
  ];
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredStudents = normalizedSearchValue
    ? teacherManagedStudents.filter((student) =>
        [
          student.name,
          student.className,
          formatBandScore(student),
          student.targetBand,
          student.weakArea,
          getPaymentStatus(student),
          student.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchValue),
      )
    : teacherManagedStudents;
  const handleRemoveStudentFromClass = (studentId) => {
    setStudentsState((current) =>
      current.map((student) =>
        student.id === studentId
          ? { ...student, classId: null, className: "Unassigned" }
          : student,
      ),
    );
    writeTeacherStudentMemberships({
      ...readTeacherStudentMemberships(),
      [studentId]: null,
    });
  };
  const handleConfirmRemoveStudent = () => {
    if (!studentPendingRemoval) {
      return;
    }

    handleRemoveStudentFromClass(studentPendingRemoval.id);
    setStudentPendingRemoval(null);
  };

  return (
    <div className="space-y-6">
      <ConfirmStudentRemovalModal
        classroomName={studentPendingRemoval?.className}
        isOpen={Boolean(studentPendingRemoval)}
        onClose={() => setStudentPendingRemoval(null)}
        onConfirm={handleConfirmRemoveStudent}
        studentName={studentPendingRemoval?.name}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
          Student directory
        </p>
        <label className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <input
            className="w-48 bg-transparent text-slate-700 outline-none placeholder:text-slate-500"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search students"
            type="text"
            value={searchValue}
          />
        </label>
      </div>

      <PanelShell>
        <table className="min-w-full table-fixed divide-y divide-slate-200/80 text-left">
          <tbody className="divide-y divide-slate-200/70 bg-white">
            {[0, 3].map((startIndex) => (
              <tr key={startIndex} className="divide-x divide-slate-200/70">
                {indicators.slice(startIndex, startIndex + 3).map((indicator) => (
                  <td className="px-5 py-5 align-top" key={indicator.label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {indicator.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {indicator.value}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{indicator.helper}</p>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </PanelShell>

      <PanelShell>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200/80 text-left">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[25%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-950">
              <tr className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Class</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Weak area</th>
                <th className="px-5 py-4">Status</th>
                <th aria-label="Remove student" className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {filteredStudents.map((student) => (
                <tr className="transition-colors duration-200 hover:bg-slate-50" key={student.id}>
                  <td className="px-5 py-4 align-top">
                    <p className="text-sm font-semibold text-slate-950">{student.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{buildInferredEmail(student)}</p>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-slate-600">{student.className}</td>
                  <td className="px-5 py-4 align-middle">
                    <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                      {formatBandScore(student)}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-slate-600">{student.weakArea}</td>
                  <td className="px-5 py-4 align-middle">
                    {(() => {
                      const paymentStatus = getPaymentStatus(student);

                      return (
                        <StatusBadge tone={paymentStatus === "Paid" ? "emerald" : "rose"}>
                          {paymentStatus}
                        </StatusBadge>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 align-middle text-right">
                    <button
                      aria-label={`Remove ${student.name} from class`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => setStudentPendingRemoval(student)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredStudents.length ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={6}>
                    No students match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherStudentsPage;
