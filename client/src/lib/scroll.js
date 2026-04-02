const HEADER_OFFSET = 108;

export function scrollToSection(sectionId, options = {}) {
  if (typeof window === "undefined") {
    return false;
  }

  const behavior = options.behavior ?? "smooth";
  const element = document.getElementById(sectionId);

  if (!element) {
    return false;
  }

  const top = element.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;

  window.scrollTo({
    top: Math.max(top, 0),
    behavior,
  });

  return true;
}

export function scrollToHash(hash, options) {
  if (!hash) {
    return false;
  }

  return scrollToSection(hash.replace(/^#/, ""), options);
}
