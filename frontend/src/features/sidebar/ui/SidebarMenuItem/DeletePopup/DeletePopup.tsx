import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useGoals, useProjects } from '@/shared/context/ProjectsContext';
import { GoalGet, ProjectGet } from '@/shared/types';

type DeletePopupProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'goal' | 'project';
};

const DeletePopup = ({ isOpen, onClose, type }: DeletePopupProps) => {
  const { goals, fetchGoals, deleteGoal } = useGoals();
  const { projects, fetchProjects, deleteProject } = useProjects();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    if (type === 'goal') {
      fetchGoals().finally(() => setLoading(false));
    } else {
      fetchProjects().finally(() => setLoading(false));
    }
  }, [isOpen, type, fetchGoals, fetchProjects]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedId) return;

    if (type === 'goal') {
      await deleteGoal(selectedId);
    } else {
      await deleteProject(selectedId);
    }

    onClose();
  };

  const options = type === 'goal' ? goals : projects;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="relative bg-[#2e2e2e] text-white p-6 rounded-2xl shadow-lg w-full max-w-md space-y-6">
          <Dialog.Title className="text-xl font-semibold">
            Delete {type === 'goal' ? 'Goal' : 'Project'}
          </Dialog.Title>

          {/* Select */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">
              Select {type}
            </label>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              disabled={loading || options.length === 0}
              className="w-full rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="" disabled>
                {loading ? 'Loading...' : `Choose a ${type}`}
              </option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {type === 'goal' ? (item as GoalGet).title : (item as ProjectGet).name}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-4">
            <button
              className="px-4 py-2 bg-gray-600 rounded text-white hover:bg-gray-500"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-600 rounded text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedId || loading}
              onClick={handleConfirm}
            >
              Delete
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default DeletePopup;
