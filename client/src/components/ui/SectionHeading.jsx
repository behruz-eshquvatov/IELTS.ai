import clsx from "clsx";

function SectionHeading({ align = "left", className, copy, eyebrow, title }) {
  return (
    <div className={clsx("space-y-6", className)}>
      {eyebrow ? (
        <p
          className={clsx(
            "muted-kicker",
            align === "center" ? "mx-auto text-center" : "text-left",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <div className={clsx("space-y-5", align === "center" ? "text-center" : "text-left")}>
        <h2 className="section-title">{title}</h2>
        {copy ? (
          <p className={clsx("section-copy", align === "center" ? "mx-auto max-w-3xl" : "max-w-2xl")}>
            {copy}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default SectionHeading;
