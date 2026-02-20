import { FormEvent, use, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { LoadingButton } from '../components/LoadingButton';
import { useCategories, useCreateGameMutation } from '../hooks/queries';

const roundsOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
const timeOptions = [15, 30, 45, 60, 90, 120];
const maxPlayersOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const GameOption = ({
  min,
  max,
  value,
  onChange,
  options,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  options: number[];
}) => {
  return (
    <div className="players-wrapper grid grid-cols-5 gap-4">
      <input type="hidden" min={min} max={max} value={value} />
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-player-count={option}
          onClick={(e) => onChange(Number(e.currentTarget.dataset.playerCount))}
          className={`cursor-pointer rounded py-2.5 text-lg ${option === value ? 'bg-blue-600' : 'bg-slate-800'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export function GameCreatePage() {
  const navigate = useNavigate();
  const { data } = useCategories();
  const createGame = useCreateGameMutation();
  const [roundsPerPlayer, setRoundsPerPlayer] = useState(2);
  const [timePerTurn, setTimePerTurn] = useState(30);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const response = await createGame.mutateAsync({
        roundsPerPlayer,
        timePerTurn,
        maxPlayers,
        categories: selectedCategories,
      });

      const gameId = response.game?.id?.trim();
      if (gameId) {
        navigate(`/game/${gameId}`);
        return;
      }

      const roomCode = response.game?.roomCode ?? response.roomCode;
      if (!roomCode || roomCode.trim().length !== 6) {
        throw new Error('Unable to create game room');
      }

      navigate(`/game/${roomCode.trim().toUpperCase()}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create game');
    }
  };

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5"
      onSubmit={submit}
    >
      <h1 className="text-xl font-semibold">Create Game</h1>
      <label className="block text-base mb-2">Rounds per player</label>
      <GameOption
        min={roundsOptions[0]}
        max={roundsOptions[roundsOptions.length - 1]}
        value={roundsPerPlayer}
        onChange={setRoundsPerPlayer}
        options={roundsOptions}
      />
      <label className="block text-base mb-2">Time per round (seconds)</label>
      <GameOption
        min={timeOptions[0]}
        max={timeOptions[timeOptions.length - 1]}
        value={timePerTurn}
        onChange={setTimePerTurn}
        options={timeOptions}
      />
      <label className="block text-base mb-2">Max players</label>
      <GameOption
        min={maxPlayersOptions[0]}
        max={maxPlayersOptions[maxPlayersOptions.length - 1]}
        value={maxPlayers}
        onChange={setMaxPlayers}
        options={maxPlayersOptions}
      />
      <div className="space-y-2 mb-6">
        <p className="text-base">Categories (Multi-select allowed)</p>
        <div className="flex flex-wrap gap-4">
          {categories.map((category) => (
            <div className="relative">
              <label key={category.id} htmlFor={category.id} className="relative group">
                <input
                  className="hidden h-0 w-0 peer"
                  type="checkbox"
                  key={category.id}
                  id={category.id}
                  checked={selectedCategories.includes(category.id)}
                  onChange={(e) =>
                    setSelectedCategories((current) =>
                      e.target.checked
                        ? [...current, category.id]
                        : current.filter((item) => item !== category.id),
                    )
                  }
                />
                <div className="flex gap-4 items-center justify-between px-5 py-2 rounded bg-slate-800 peer-checked:bg-blue-600 cursor-pointer">
                  {selectedCategories.includes(category.id) ? (
                    <i className="fa-solid fa-xmark" />
                  ) : (
                    <i className="fa-solid fa-check" />
                  )}
                  <span className="text-base">{category.name}</span>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <LoadingButton
        variant="primary"
        modifier="h-12"
        disabled={createGame.isPending || selectedCategories.length === 0}
        isLoading={createGame.isPending}
        loadingText="Creating..."
      >
        Create room
      </LoadingButton>
    </form>
  );
}
