import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { LoadingButton } from '../components/LoadingButton';
import { useCategories, useCreateGameMutation } from '../hooks/queries';

export function GameCreatePage() {
  const navigate = useNavigate();
  const { data } = useCategories();
  const createGame = useCreateGameMutation();
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(2);
  const [timePerTurn, setTimePerTurn] = useState(30);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const response = await createGame.mutateAsync({
      roundsPerPlayer,
      timePerTurn,
      maxPlayers,
      categories: selectedCategories,
    });
    navigate(`/game/${response.roomCode}`);
  };

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5"
      onSubmit={submit}
    >
      <h1 className="text-xl font-semibold">Create Game</h1>
      <label className="block text-sm">Rounds per player</label>
      <input
        type="number"
        min={1}
        max={10}
        value={roundsPerPlayer}
        onChange={(e) => setRoundsPerPlayer(Number(e.target.value))}
        className="w-full rounded bg-slate-800 p-2 text-sm"
      />
      <label className="block text-sm">Time per turn (seconds)</label>
      <input
        type="number"
        min={5}
        max={120}
        value={timePerTurn}
        onChange={(e) => setTimePerTurn(Number(e.target.value))}
        className="w-full rounded bg-slate-800 p-2 text-sm"
      />
      <label className="block text-sm">Max players</label>
      <input
        type="number"
        min={2}
        max={12}
        value={maxPlayers}
        onChange={(e) => setMaxPlayers(Number(e.target.value))}
        className="w-full rounded bg-slate-800 p-2 text-sm"
      />
      <div className="space-y-1">
        <p className="text-sm">Categories</p>
        {categories.map((category) => (
          <label key={category.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedCategories.includes(category.id)}
              onChange={(e) => {
                setSelectedCategories((current) =>
                  e.target.checked
                    ? [...current, category.id]
                    : current.filter((item) => item !== category.id),
                );
              }}
            />
            {category.name}
          </label>
        ))}
      </div>
      <LoadingButton
        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={createGame.isPending || selectedCategories.length === 0}
        isLoading={createGame.isPending}
        loadingText="Creating..."
      >
        Create room
      </LoadingButton>
    </form>
  );
}
