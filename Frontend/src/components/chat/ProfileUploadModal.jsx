import { useState } from 'react'
import { toast } from 'react-toastify'
import { uploadProfileImage } from '../../services/chatService'

const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function ProfileUploadModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      toast.error('Only JPG and PNG files are allowed')
      return
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      toast.error('File size must be 5MB or less')
      return
    }
    setFile(nextFile)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!file) {
      toast.error('Please choose an image first')
      return
    }
    try {
      setLoading(true)
      const profile = await uploadProfileImage(file)
      onUploaded?.(profile)
      toast.success('Profile image updated')
      onClose?.()
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Upload Profile Picture</h3>
        <p className="mt-1 text-sm text-slate-600">JPG or PNG only, maximum file size 5MB.</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {file ? <p className="text-xs text-slate-500">{file.name}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileUploadModal
