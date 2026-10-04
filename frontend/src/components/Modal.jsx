export default function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-navy-950/40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-5 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy-950">{title}</h2>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-navy-950">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
