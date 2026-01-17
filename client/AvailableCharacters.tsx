type CharacterInfo = {
  name: string;
  objective: string;
  setupText: string;
};

type AvailableCharactersProps = {
  characters: CharacterInfo[];
};

export function AvailableCharacters({ characters }: AvailableCharactersProps) {
  if (characters.length === 0) {
    return null;
  }

  return (
    <section className="available-characters">
      <h3>Available Characters</h3>
      <div className="character-list">
        {characters.map((char) => (
          <div key={char.name} className="character-card">
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
