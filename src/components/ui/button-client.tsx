"use client";

import { useSyncExternalStore, type ComponentPropsWithRef } from "react";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./button-styles";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Keep SSR buttons inert until React is interactive; clicks before hydration
  // would otherwise fall back to a native submit/navigation and be lost.
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || !hydrated}
      {...props}
    />
  );
}
