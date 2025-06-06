import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface ScenarioActionsProps {
  moduleId: string;
  scenarioId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ScenarioActions: React.FC<ScenarioActionsProps> = ({
  moduleId,
  scenarioId,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate(`/modules/${moduleId}/scenarios/new`);
  };

  return (
    <div className="flex gap-2">
      {!scenarioId && (
        <button
          onClick={handleAdd}
          className="p-2 text-green-600 hover:bg-green-50 rounded-full"
          title="Add new scenario"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
      {scenarioId && (
        <>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
            title="Edit scenario"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
            title="Delete scenario"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
};

export default ScenarioActions;