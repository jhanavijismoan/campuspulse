import PulseAI from '../components/PulseAI';

export default function PulseAIPage() {
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">Pulse AI</h1>
        <p className="text-sm text-gray-500">Your AI college assistant.</p>
      </div>
      <PulseAI />
    </div>
  );
}
