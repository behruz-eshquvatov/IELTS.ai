import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import useCanHover from '../../hooks/useCanHover';

const MagneticButton = ({
  href,
  to,
  children,
  className = '',
  innerClassName = '',
  disableGlow = false,
  disableMagnetic = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  type = 'button',
  ...rest
}) => {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const glowRef = useRef(null);
  const canHover = useCanHover();

  const handleMove = (event) => {
    if (!canHover || disableMagnetic || !outerRef.current || !innerRef.current) return;

    const bounds = outerRef.current.getBoundingClientRect();

    const relX = event.clientX - bounds.left;
    const relY = event.clientY - bounds.top;

    const x = (relX - bounds.width / 2) * 0.18;
    const y = (relY - bounds.height / 2) * 0.28;

    // magnetic motion
    gsap.to(innerRef.current, {
      x,
      y,
      scale: 1.02,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    // glow follow
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        x: relX,
        y: relY,
        duration: 0.2,
        ease: 'power2.out',
      });
    }
  };

  const handleEnter = (event) => {
    if (!canHover || disableMagnetic) {
      onMouseEnter?.(event);
      return;
    }

    gsap.to(outerRef.current, {
      scale: 1.01,
      duration: 0.25,
      ease: 'power2.out',
    });

    if (!disableGlow && glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
      });
    }

    onMouseEnter?.(event);
  };

  const handleLeave = (event) => {
    if (!canHover || disableMagnetic) {
      onMouseLeave?.(event);
      return;
    }

    gsap.to(outerRef.current, {
      scale: 1,
      duration: 0.4,
      ease: 'power3.out',
    });

    gsap.to(innerRef.current, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.6,
      ease: 'elastic.out(1, 0.42)',
    });

    if (!disableGlow && glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    }

    onMouseLeave?.(event);
  };

  const sharedProps = {
    ref: outerRef,
    onClick,
    onMouseMove: canHover && !disableMagnetic ? handleMove : undefined,
    onMouseEnter: canHover ? handleEnter : onMouseEnter,
    onMouseLeave: canHover ? handleLeave : onMouseLeave,
    className: `relative inline-block ${className}`, // cursor visible now
    ...rest,
  };

  const content = (
    <span
      ref={innerRef}
      className={`relative block will-change-transform overflow-hidden ${innerClassName}`}
    >
      {!disableGlow ? (
        <span
          ref={glowRef}
          className="pointer-events-none absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-2xl"
          style={{
            background:
              'radial-gradient(circle, rgba(123,167,217,0.35) 0%, rgba(123,167,217,0.18) 40%, transparent 70%)',
          }}
        />
      ) : null}

      {children}
    </span>
  );

  if (to) {
    return (
      <Link {...sharedProps} to={to}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a {...sharedProps} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button {...sharedProps} type={type}>
      {content}
    </button>
  );
};

export default MagneticButton;
