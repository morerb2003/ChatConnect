import { getInitials, resolveMediaUrl } from '../../utils/media'

function Avatar({ name, imageUrl, size = 'md', onClick, className = '' }) {
  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
        ? 'h-12 w-12 text-sm'
        : 'h-10 w-10 text-sm'
  const src = resolveMediaUrl(imageUrl)
  const clickable = typeof onClick === 'function'

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
        onClick={onClick}
        className={`${sizeClass} rounded-full object-cover ${clickable ? 'cursor-pointer' : ''} ${className}`}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={`inline-grid ${sizeClass} place-items-center rounded-full bg-slate-200 font-semibold text-slate-700 ${clickable ? 'cursor-pointer' : ''} ${className}`}
      aria-label={name || 'User avatar'}
      role={clickable ? 'button' : undefined}
    >
      {getInitials(name)}
    </div>
  )
}

export default Avatar
