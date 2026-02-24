import styles from "./score-edit.module.css";

type Props = {
  genres: string[];
  allGenres: any[];
  onChange: (newGenres: string[]) => void;
};

export const GenreInput = ({ genres, allGenres, onChange }: Props) => {
  const updateGenre = (index: number, value: string) => {
    const newGenres = [...genres];
    newGenres[index] = value;
    onChange(newGenres);
  };

  const removeGenre = (index: number) => {
    onChange(genres.filter((_, i) => i !== index));
  };

  const addGenre = () => {
    onChange([...genres, ""]);
  };

  return (
    <>
      {genres.map((selectedId, idx) => (
        <div key={idx} className={styles.genreSelectWrapper}>
          <select className={styles.scoreGenre} value={selectedId} onChange={(e) => updateGenre(idx, e.target.value)}>
            <option value="">選択してください</option>
            {allGenres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {genres.length > 1 && (
            <button type="button" className={styles.removeGenre} onClick={() => removeGenre(idx)}>×</button>
          )}
        </div>
      ))}
      <button type="button" className={styles.addGenre} onClick={addGenre}>＋ ジャンルを追加</button>
    </>
  );
};