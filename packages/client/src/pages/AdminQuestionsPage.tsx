import { ModerationQueue } from '../components/ModerationQueue';
import { ApprovedQuestionManager } from '../components/ApprovedQuestionManager';

export function AdminQuestionsPage() {
  return (
    <div className="space-y-4">
      <ModerationQueue />
      <ApprovedQuestionManager />
    </div>
  );
}
