import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import useCanHover from '../../hooks/useCanHover';

const MAX_SHIFT_X = 7;
const MAX_SHIFT_Y = 5;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const MagneticButton = ({
  href,
  to,
  children,
  className = '',
  innerClassName = '',
  disableGlow = false,
  disableMagnetic = false,
  disabled = false,
  maxShiftX = MAX_SHIFT_X,
  maxShiftY = MAX_SHIFT_Y,
  motionDuration = 0.18,
  resetDuration = 0.28,
  onBlur,
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
  const isInteractive = canHover && !disableMagnetic && !disabled;

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const glow = glowRef.current;

    return () => {
      gsap.killTweensOf([outer, inner, glow].filter(Boolean));
    };
  }, []);

  const resetMotion = (duration = resetDuration) => {
    gsap.killTweensOf([outerRef.current, innerRef.current, glowRef.current].filter(Boolean));

    if (outerRef.current) {
      gsap.to(outerRef.current, {
        scale: 1,
        duration,
        ease: 'power3.out',
        overwrite: true,
      });
    }

    if (innerRef.current) {
      gsap.to(innerRef.current, {
        x: 0,
        y: 0,
        scale: 1,
        duration,
        ease: 'power3.out',
        overwrite: true,
      });
    }

    if (!disableGlow && glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  };

  const handleMove = (event) => {
    if (!isInteractive || !outerRef.current || !innerRef.current) return;

    const bounds = outerRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const relX = event.clientX - bounds.left;
    const relY = event.clientY - bounds.top;
    const normalizedX = (relX / bounds.width - 0.5) * 2;
    const normalizedY = (relY / bounds.height - 0.5) * 2;

    const safeMaxShiftX = Math.max(0, Number(maxShiftX) || 0);
    const safeMaxShiftY = Math.max(0, Number(maxShiftY) || 0);
    const safeMotionDuration = Math.max(0.04, Number(motionDuration) || 0.18);
    const x = clamp(normalizedX * safeMaxShiftX, -safeMaxShiftX, safeMaxShiftX);
    const y = clamp(normalizedY * safeMaxShiftY, -safeMaxShiftY, safeMaxShiftY);

    gsap.to(innerRef.current, {
      x,
      y,
      scale: 1.015,
      duration: safeMotionDuration,
      ease: 'power3.out',
      overwrite: true,
    });

    if (!disableGlow && glowRef.current) {
      gsap.to(glowRef.current, {
        x: relX,
        y: relY,
        duration: safeMotionDuration,
        ease: 'power3.out',
        overwrite: true,
      });
    }
  };

  const handleEnter = (event) => {
    if (!isInteractive) {
      onMouseEnter?.(event);
      return;
    }

    const safeMotionDuration = Math.max(0.04, Number(motionDuration) || 0.18);

    gsap.to(outerRef.current, {
      scale: 1.01,
      duration: safeMotionDuration,
      ease: 'power3.out',
      overwrite: true,
    });

    if (!disableGlow && glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 1,
        duration: safeMotionDuration,
        ease: 'power2.out',
        overwrite: true,
      });
    }

    onMouseEnter?.(event);
  };

  const handleLeave = (event) => {
    if (!isInteractive) {
      onMouseLeave?.(event);
      return;
    }

    resetMotion(resetDuration);
    onMouseLeave?.(event);
  };

  const handleBlur = (event) => {
    resetMotion(0.18);
    onBlur?.(event);
  };

  const sharedProps = {
    ref: outerRef,
    disabled,
    onClick,
    onMouseMove: isInteractive ? handleMove : undefined,
    onMouseEnter: isInteractive ? handleEnter : onMouseEnter,
    onMouseLeave: isInteractive ? handleLeave : onMouseLeave,
    onBlur: handleBlur,
    className: `relative inline-block align-middle ${className}`,
    ...rest,
  };

  const content = (
    <span
      ref={innerRef}
      className={`relative block transform-gpu will-change-transform overflow-hidden ${innerClassName}`}
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
