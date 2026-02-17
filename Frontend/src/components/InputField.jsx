function InputField({
  id,
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  rightElement,
}) {
  const classes = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
    error
      ? 'border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-100'
      : 'border-slate-300 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
  }`

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`${classes} ${rightElement ? 'pr-14' : ''}`}
        />
        {rightElement ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightElement}</div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

export default InputField
