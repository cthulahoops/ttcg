import type { DecisionRequest } from "@shared/protocol";

type CharacterInfo = {
  name: string;
  objective: string;
  setupText: string;
};

type AvailableCharactersProps = {
  characters: CharacterInfo[];
  selectCharacterDecision?: DecisionRequest;
  onRespond?: (response: unknown) => void;
};

export function AvailableCharacters({
  characters,
  selectCharacterDecision,
  onRespond,
}: AvailableCharactersProps) {
  if (characters.length === 0) {
    return null;
  }

  const isClickable =
    selectCharacterDecision?.type === "select_character" && onRespond;

  return (
    <section className="available-characters">
      <h3>Available Characters</h3>
      <div className="character-list">
        {characters.map((char) => (
          <div
            key={char.name}
            className={`character-card ${isClickable ? "clickable" : ""}`}
            onClick={isClickable ? () => onRespond(char.name) : undefined}
          >
            <div className="character-name">{char.name}</div>
            <div className="character-objective">
              <strong>Objective:</strong> {char.objective}
            </div>
            <div className="character-setup">
              <strong>Setup:</strong> {char.setupText}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
