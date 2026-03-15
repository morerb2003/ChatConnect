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
  const classes = `w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${
    error
      ? 'border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:bg-red-950/20 dark:focus:ring-red-900/30'
      : 'border-slate-300 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-400 dark:focus:bg-slate-900 dark:focus:ring-blue-900/30'
  }`

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
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
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}

export default InputField
