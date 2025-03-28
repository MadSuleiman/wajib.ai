export type VocabularyItem = {
  word: string;
  definition: string;
};

export type PreloadedList = {
  id: string;
  title: string;
  description: string;
  vocabulary: VocabularyItem[];
};

export type StudySession = {
  list: PreloadedList;
  knownWords: number;
  totalAnswered: number;
  timestamp: number;
};
