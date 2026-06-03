export default function IconButton({
  icon,
  label,
  variant = 'default',
  title,
  className = '',
  type = 'button',
  ...rest
}) {
  const variantClass = variant === 'ghost' ? ' btn-ghost' : '';
  const tooltip = title ?? label;

  return (
    <button
      type={type}
      className={`btn btn-icon${variantClass}${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={tooltip}
      {...rest}
    >
      {icon}
    </button>
  );
}
