import { memo } from "react";

// We split the labels to easily highlight the key phrases like the image
const summaryCards = [
  {
    id: "goal",
    preLabel: "Estimated time to",
    highlight: "Band 7.0",
    postLabel: "is",
    value: "72",
    suffix: "DAYS",
    isPrimary: true,
  },
  {
    id: "streak",
    preLabel: "Current study",
    highlight: "streak",
    postLabel: "is",
    value: "12",
    suffix: "DAYS",
    isPrimary: false,
  },
];

const StudentSummaryCards = memo(function StudentSummaryCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {summaryCards.map((card) => (
        <div
          key={card.id}
          className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-[white] p-2 py-4"
        >
          {/* Top section: Label with Highlight block */}
          <div className="z-10 text-xl font-medium text-slate-800">
            {card.preLabel}{" "}
            <span
              className={`px-1.5 py-0.5 font-bold text-black ${card.isPrimary ? "bg-emerald-400" : "bg-amber-200"
                }`}
            >
              {card.highlight}
            </span>{" "}
            {card.postLabel}
          </div>

          {/* Bottom section: Massive Number with Bottom Fade */}
          <div className="absolute -bottom-4 left-2 z-0 flex items-baseline gap-4">
            <span className="bg-gradient-to-b from-slate-800 from-55% to-transparent bg-clip-text text-[11rem] font-black leading-none tracking-tighter text-transparent">
              {card.value}
            </span>
            <span className="bg-gradient-to-b from-slate-800 from-55% to-transparent bg-clip-text text-[6.5rem] font-thin leading-none tracking-wider text-transparent">
              {card.suffix}
            </span>
          </div>
          {card.id !== "goal" ? (
            <svg
              className="absolute -top-6 -right-6 h-80 w-80 opacity-20 fill-amber-300"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="auto"
                d="M20 15c0 4.255-2.618 6.122-4.641 6.751c-.432.134-.715-.369-.457-.74c.88-1.265 1.898-3.195 1.898-5.01c0-1.951-1.644-4.254-2.928-5.675c-.293-.324-.805-.11-.821.328c-.053 1.45-.282 3.388-1.268 4.908a.412.412 0 0 1-.677.036c-.308-.39-.616-.871-.924-1.252c-.166-.204-.466-.207-.657-.026c-.747.707-1.792 1.809-1.792 3.18c0 .93.36 1.905.767 2.69c.224.43-.174.95-.604.724C6.113 19.98 4 18.084 4 15c0-3.146 4.31-7.505 5.956-11.623c.26-.65 1.06-.955 1.617-.531C14.943 5.414 20 10.378 20 15"
              />
            </svg>
          ) : (
            <svg
              className="absolute -top-14 -right-10 h-90 w-90 opacity-20 fill-emerald-500"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="auto"
                d="M8 20v-5H4.575q-.475 0-.675-.425t.1-.8l7.225-8.825q.3-.375.775-.375t.775.375L20 13.775q.3.375.1.8t-.675.425H16v5q0 .425-.288.713T15 21H9q-.425 0-.712-.288T8 20"
              />
            </svg>
          )}
        </div>
      ))}
    </section>
  );
});

export default StudentSummaryCards;
